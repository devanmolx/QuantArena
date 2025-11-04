import type { MACDOutput } from "technicalindicators/declarations/moving_averages/MACD.js";

export interface CandleType {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
}

export interface CandleStickDataType {
    data: CandleType[];
    midPrices: number[];
    ema20: number[];
    macd: MACDOutput[];
}