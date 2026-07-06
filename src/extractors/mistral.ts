import {Mistral} from "@mistralai/mistralai"
import { configDotenv } from "dotenv";
configDotenv()

export const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });