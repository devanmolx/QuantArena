import axios from "axios";
import dotenv from "dotenv";
import { BINANCE_BASE_URL } from "../config/constants.ts";
import type { Candle } from "../types/types.ts";
import { calculateIndicators } from "../utils/indicators.ts";
dotenv.config();

class BinanceService {
    async getCandleStickData(symbol: string, interval: string, limit: number = 100): Promise<any> {
        const response = await axios.get(`${BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, {
            headers: {
                'X-MBX-APIKEY': process.env.BINANCE_API_KEY,
                'X-MBX-APISECRET': process.env.BINANCE_API_SECRET
            }
        });
        const data: Candle[] = response.data.map((candle: any[]) => ({
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
}

const binanceService = new BinanceService();

export default binanceService;