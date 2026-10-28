import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { db } from "../db/index.js";
import {z} from "zod";
import { charter_sources } from "../db/schema.js";
import { mkdir, writeFile } from "fs/promises";
import path from "node:path"
import { configDotenv } from "dotenv";


configDotenv()

export const createUploadBody = createInsertSchema(charter_sources).pick({
  org_id: true,
})

//infering zod schema
export type CreateUploadInput = z.infer<typeof createUploadBody>

//save the incoming file to disk 
export async function saveFileToDisk(
  buffer: Buffer,
  sourceId: string,
  filename: string,
): Promise<string> {
  //create specific directory
  const uploadDir = path.join(process.env.UPLOAD_DIR ?? './uploads', sourceId); 
  await mkdir(uploadDir, { recursive: true })
  const filePath = path.join(uploadDir, filename)
  //writing the file stored in the buffer to path
  await writeFile(filePath, buffer)
  return filePath
}

//parse the incoming request to extract the file 