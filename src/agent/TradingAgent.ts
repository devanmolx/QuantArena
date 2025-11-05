import binanceService from "../services/BinanceService.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../services/LLMService.js";
import { createPositionTool, closePositionTool } from "./tools.js";
import prisma from "../utils/prisma.js";

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
        You are an autonomous crypto trading agent that must make decisions each cycle.

        Your mission: maximize profit and minimize drawdown. You have tools:
        - createPosition(symbol: string, side: "LONG" | "SHORT", amount: number, reason: string)
        - closePosition(symbol: string, reason: string)

        DATA CONTEXT:

        Time Elapsed: {minutesSinceStart} minutes since start
        Current Time: {currentTime}
        Invocation Count: {invocationCount}

        MARKET DATA (ordered oldest → newest):
        {BTCData}

        ACCOUNT INFO:
        Total Return (%): {totalReturn}
        Available Cash: {availableCash}
        Account Value: {accountValue}

        CURRENT OPEN POSITIONS:
        {openPositions}

        Now:
        - Analyze the market
        - Decide whether to open or close any positions
        - Use the correct tool(s) to execute
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

    const toolCalls = result.tool_calls;

    await prisma.agentInvocation.create({
        data: {
            minutesSinceStart,
            invocationCount,
            accountValue,
            availableCash,
            totalReturn,
            btcData: BTCData,
            openPositions,
            toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
            response: result.text,
        }
    })

    if (toolCalls?.length) {
        for (const toolCall of toolCalls) {
            try {
                if (toolCall.name === "createPosition") {
                    await createPositionTool.invoke(toolCall);
                } else if (toolCall.name === "closePosition") {
                    await closePositionTool.invoke(toolCall);
                }
            } catch (err) {
                console.error(`❌ Error executing ${toolCall.name}:`, err);
            }
        }
    } else {
        console.log("No tool calls made.");
    }
}
