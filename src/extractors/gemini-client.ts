import { GoogleGenAI } from "@google/genai";
import { configDotenv } from "dotenv";
configDotenv();

export const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
