import binanceService from "../services/BinanceService.ts";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../services/LLMService.ts";
import { createPositionTool, closePositionTool } from "./tools.ts";

let invocationCount = 0;
const startTime = Date.now();

export async function invokeAgent() {
    invocationCount++;

    const minutesSinceStart = Math.floor((Date.now() - startTime) / 60000);
    const currentTime = new Date().toISOString();

    const accountData = await binanceService.getAccountData(1);

    if (!accountData) {
        throw new Error("Account not found");
    }

    const totalReturn = accountData.totalReturn;
    const availableCash = accountData.availableCash;
    const accountValue = accountData.accountValue;

    const openPositions = accountData.positions;

    const BTCData = await binanceService.getFormattedData("BTCUSDT");

    const prompt = ChatPromptTemplate.fromTemplate(`
        It has been {minutesSinceStart} minutes since you started trading.
        The current time is {currentTime} and you've been invoked {invocationCount} times.

        Below, we provide state data, price data, and predictive signals for you to analyze and discover alpha.
        ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED OLDEST → NEWEST.

        CURRENT MARKET STATE FOR ALL COINS

        {BTCData}

        HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE
        
        Current Total Return (percent): {totalReturn}
        Available Cash: {availableCash}
        Current Account Value: {accountValue}

        Current live positions and performance: {openPositions}
  `);

    const llmWithTools = llm.bindTools([createPositionTool, closePositionTool]);

    const chain = prompt.pipe(llmWithTools);

    const result = await chain.invoke({
        minutesSinceStart,
        currentTime,
        invocationCount,
        BTCData: JSON.stringify(BTCData, null, 2),
        totalReturn,
        availableCash,
        accountValue,
        openPositions: JSON.stringify(openPositions, null, 2),
    });

    console.log("Agent Response:", result);

    if (result.tool_calls?.length) {
        for (const toolCall of result.tool_calls) {
            try {
                if (toolCall.name === "createPosition") {
                    await createPositionTool.invoke(toolCall.args);
                } else if (toolCall.name === "closePosition") {
                    await closePositionTool.invoke(toolCall.args);
                }
            } catch (err) {
                console.error(`❌ Error executing ${toolCall.name}:`, err);
            }
        }
    } else {
        console.log("No tool calls made.");
    }
}
