import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
dotenv.config();

export const llm = new ChatOpenAI({
    model: "qwen/qwen3-32b",
    apiKey: process.env.GROQ_API_KEY || "",
    configuration: {
        baseURL: "https://api.groq.com/openai/v1"
    }
});
