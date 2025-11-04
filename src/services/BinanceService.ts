import axios from "axios";
import dotenv from "dotenv";
import { BINANCE_BASE_URL } from "../config/constants.ts";
import type { CandleStickDataType, CandleType } from "../types/types.ts";
import { calculateIndicators } from "../utils/indicators.ts";
import prisma from "../utils/prisma.ts";
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
}

const binanceService = new BinanceService();

export default binanceService;