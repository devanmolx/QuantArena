import { z } from "zod";
import { tool } from "@langchain/core/tools";
import binanceService from "../services/BinanceService.ts";
import prisma from "../utils/prisma.ts";

export const createPositionTool = tool(
    async ({ symbol, side, quantity, leverage }: { symbol: string; side: "LONG" | "SHORT"; quantity: number; leverage: number }) => {

        const accountId = 1;

        const entryPrice = await binanceService.getCurrentPrice(symbol);

        const marginRequired = (entryPrice * quantity) / leverage;

        const account = await prisma.account.findUnique({ where: { id: accountId } });

        if (!account) {
            throw new Error("Account not found");
        }

        if (account.availableCash < marginRequired) {
            throw new Error(`Insufficient cash. Need ${marginRequired}, have ${account.availableCash}`);
        }

        const position = await prisma.position.create({
            data: {
                symbol,
                side,
                entryPrice,
                quantity,
                leverage,
                isOpen: true,
                accountId
            },
        });

        await prisma.account.update({
            where: { id: accountId },
            data: {
                availableCash: account.availableCash - marginRequired,
            },
        });

        console.log(`✅ Opened ${side} position for ${symbol} at ${entryPrice}, qty=${quantity}, lev=${leverage}`);

        return {
            status: "opened",
            symbol,
            side,
            quantity,
            entryPrice,
            leverage,
            marginUsed: marginRequired,
        };
    },
    {
        name: "createPosition",
        description: "Open a simulated trading position and update the database",
        schema: z.object({
            symbol: z.string(),
            side: z.enum(["LONG", "SHORT"]),
            quantity: z.number(),
            leverage: z.number(),
        }),
    }
);

export const closePositionTool = tool(
    async ({ symbol }: { symbol: string }) => {
        const accountId = 1;

        const position = await prisma.position.findFirst({
            where: { symbol, isOpen: true, accountId },
        });

        if (!position) throw new Error(`No open position found for ${symbol}`);

        const currentPrice = await binanceService.getCurrentPrice(symbol);
        const diff = (currentPrice - position.entryPrice) * position.quantity * position.leverage;
        const pnl = position.side === "LONG" ? diff : -diff;

        await prisma.position.update({
            where: { id: position.id },
            data: {
                pnl,
                isOpen: false,
                exitPrice: currentPrice,
                closedAt: new Date(),
            },
        });

        const account = await prisma.account.findUnique({ where: { id: accountId } });
        if (!account) throw new Error("Account not found");

        const marginReleased = (position.quantity * position.entryPrice) / position.leverage;
        const newCash = account.availableCash + marginReleased + pnl;

        const totalReturn = parseFloat(
            (((account.accountValue - account.initialCapital) / account.initialCapital) * 100).toFixed(2)
        );

        await prisma.account.update({
            where: { id: accountId },
            data: { availableCash: newCash, totalReturn },
        });

        console.log(`✅ Closed ${symbol} at ${currentPrice}. PnL: ${pnl.toFixed(2)}.`);

        return {
            status: "closed",
            symbol,
            exitPrice: currentPrice,
            pnl: parseFloat(pnl.toFixed(2)),
            newCash: parseFloat(newCash.toFixed(2)),
            totalReturn
        };
    },
    {
        name: "closePosition",
        description: "Close a simulated trading position and update the database",
        schema: z.object({
            symbol: z.string(),
        }),
    }
);
