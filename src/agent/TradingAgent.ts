import binanceService from "../services/BinanceService.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../services/LLMService.js";
import { createPositionTool, closePositionTool } from "./tools.js";
import prisma from "../utils/prisma.js";

export async function invokeAgent(invocationCount: number, startTime: number) {

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
        You are an expert trader. You were given $10000 dollars to trade with. 
        You are trading on the crypto market. You are given the following information:

        You have tools:
        - createPosition(symbol: string, side: "LONG" | "SHORT", quantity: number, leverage: number)
        - closePosition(transactionId: number)

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
