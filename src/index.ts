import { invokeAgent } from "./agent/TradingAgent.js";

let invocationCount = 0;
const startTime = Date.now();

invokeAgent(invocationCount, startTime);
invocationCount++;

setTimeout(() => {
    invokeAgent(invocationCount, startTime);
    invocationCount++;
}, 1000 * 60 * 10)