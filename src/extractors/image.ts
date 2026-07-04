//image extraction using mistral AI

import { Mistral } from "@mistralai/mistralai";
import { configDotenv } from "dotenv";
import fs from "fs"; //file system module of node

configDotenv();

//extraction prompt
const extractionPrompt = "test";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY});

const imagePath = "/src/images/phokhara_uni.jpg";

//encode the image to base64
function encodeImage(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  return base64Image;
}

async function extractFromImage(imgSource: string, extractionPrompt: string) {
  const response = await client.chat.complete({
    model: "mistral-medium-latest",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: extractionPrompt },
          { type: "image_url", imageUrl: imgSource },
        ],
      },
    ],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content || [];
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch (err) {
      console.log("Response is not a valid JSON:", content);
      return content;
    }
  }
  return content;
}

const localImageBase64 = encodeImage(imagePath);

extractFromImage(localImageBase64, extractionPrompt);
