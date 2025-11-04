import { z } from "zod";
import { tool } from "@langchain/core/tools";

export const createPositionTool = tool(
    async ({ symbol, side, quantity }: { symbol: string; side: "LONG" | "SHORT"; quantity: number }) => {
        console.log(`Opening ${side} position for ${symbol} with quantity ${quantity}`);
        return { status: "opened", symbol, side, quantity };
    },
    {
        name: "createPosition",
        description: "Open a simulated trading position",
        schema: z.object({
            symbol: z.string(),
            side: z.enum(["LONG", "SHORT"]),
            quantity: z.number(),
        }),
    }
);

export const closePositionTool = tool(
    async ({ symbol }: { symbol: string }) => {
        console.log(`Closing position for ${symbol}`);
        return { status: "closed", symbol };
    },
    {
        name: "closePosition",
        description: "Close a simulated trading position",
        schema: z.object({
            symbol: z.string(),
        }),
    }
);
