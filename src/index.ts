import { invokeAgent } from "./agent/TradingAgent.ts";

setTimeout(() => {
    invokeAgent();
}, 1000 * 60 * 60 * 10)