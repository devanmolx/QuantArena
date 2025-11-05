import axios from "axios";
import dotenv from "dotenv";
import { BINANCE_BASE_URL } from "../config/constants.js";
import type { CandleStickDataType, CandleType } from "../types/types.js";
import { calculateIndicators } from "../utils/indicators.js";
import prisma from "../utils/prisma.js";
dotenv.config();

class BinanceService {
    async getCandleStickData(symbol: string, interval: string, limit: number = 100): Promise<CandleStickDataType> {
        const response = await axios.get(`${BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);

        const data: CandleType[] = response.data.map((candle: any[]) => ({
            openTime: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5]),
            closeTime: candle[6],
        }));

        const { midPrices, ema20, macd } = calculateIndicators(data);

        return {
            data,
            midPrices,
            ema20,
            macd
        }
    }

    async getOpenPositions() {
        const positions = await prisma.position.findMany({
            where: {
                isOpen: true
            }
        })

        return positions;
    }

    async getFormattedData(symbol: string) {
        const shortTermData = await this.getCandleStickData(symbol, "5m");
        const longTermData = await this.getCandleStickData(symbol, "4h");

        return `

            ALL ${symbol} DATA

            current_price = ${shortTermData.data[shortTermData.data.length - 1]?.close}
            current_ema20 = ${shortTermData.ema20[shortTermData.ema20.length - 1]}
            current_macd = ${JSON.stringify(shortTermData.macd[shortTermData.macd.length - 1])}

            Intraday series (5-minute intervals, oldest → latest):

            Mid prices: [${shortTermData.midPrices.join(", ")}]
            EMA indicators (20-period): [${shortTermData.ema20.join(", ")}]
            MACD indicators: [${JSON.stringify(shortTermData.macd[shortTermData.macd.length - 1])}]

            Longer-term context (4-hour timeframe):
            Mid prices: [${longTermData.midPrices.join(", ")}]
            EMA indicators (20-period): [${longTermData.ema20.join(", ")}]
            MACD indicators: [${JSON.stringify(longTermData.macd[longTermData.macd.length - 1])}]

        `
    }

    async getAccountData(id: number) {
        const account = await prisma.account.findUnique({
            where: {
                id
            },
            include: {
                positions: {
                    where: {
                        isOpen: true
                    },
                    include: {
                        exit_plan: true
                    }
                },
            }
        })

        if (!account) {
            throw new Error("Account not found");
        }

        const symbols = [...new Set(account.positions.map(p => p.symbol))];
        const prices = await Promise.all(symbols.map(symbol => this.getCurrentPrice(symbol)));

        const priceMap = Object.fromEntries(symbols.map((s, i) => [s, prices[i]]));

        let totalPnl = 0;

        const updatedPositions = await Promise.all(
            account.positions.map(async (position) => {
                const pnl = parseFloat(
                    (((priceMap[position.symbol]! - position.entryPrice) * position.quantity).toFixed(2))
                );

                position.pnl = position.side === "LONG" ? pnl : -pnl;
                totalPnl += position.pnl;

                await prisma.position.update({
                    where: { id: position.id },
                    data: { pnl: position.pnl },
                });

                return position;
            })
        );

        account.accountValue = parseFloat((account.accountValue + totalPnl).toFixed(2));

        account.totalReturn = parseFloat(
            (((account.accountValue - account.initialCapital) / account.initialCapital) * 100).toFixed(2)
        );

        await prisma.account.update({
            where: { id: account.id },
            data: {
                totalReturn: account.totalReturn,
                accountValue: account.accountValue,
                availableCash: account.availableCash,
            }
        })

        return { ...account, positions: updatedPositions };
    }

    async getCurrentPrice(symbol: string): Promise<number> {
        const response = await axios.get(`${BINANCE_BASE_URL}/ticker/price?symbol=${symbol}`);
        return parseFloat(response.data.price);
    }
}

const binanceService = new BinanceService();

export default binanceService;