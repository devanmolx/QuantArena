import { EMA, MACD } from "technicalindicators";
import type { Candle } from "../types/types.ts";

export const calculateIndicators = (data: Candle[]) => {
    const closes = data.map((candle: Candle) => candle.close);

    const ema20 = EMA.calculate({ values: closes, period: 20 }).splice(-10);

    const macd = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    }).slice(-10);

    const midPrices = data.map((candle: Candle) => (candle.high + candle.low) / 2).slice(-10);

    return {
        midPrices,
        ema20,
        macd,
    }
}