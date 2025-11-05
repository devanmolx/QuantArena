import { invokeAgent } from "./agent/TradingAgent.js";

invokeAgent();

setTimeout(() => {
    invokeAgent();
}, 1000 * 60 * 10)