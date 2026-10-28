import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import {z} from "zod";
import { charter_sources } from "../db/schema.js";
import { mkdir, writeFile } from "fs/promises";
import path from "node:path"
import { configDotenv } from "dotenv";
import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";


configDotenv()

export const createUploadBody = createInsertSchema(charter_sources).pick({
  org_id: true,
})

//infering zod schema
export type CreateUploadInput = z.infer<typeof createUploadBody>


const SRC_TYPE_EXTENSION: Record<string, string> = {
  ".pdf": "pdf"//to-do: add remaining source type
};

export function detectSourceType(filename: string): string | null {
  return SRC_TYPE_EXTENSION[path.extname(filename).toLowerCase()] ?? null
}



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
export async function saveUpload({
  orgId,
  buffer,
  filename,
}: {
    orgId: string;
    buffer: Buffer;
    filename: string;
  }) {
  const sourceType = detectSourceType(filename);
  if (!sourceType) throw new Error(`unsupported filetype: ${filename} `)

  const sourceId = randomUUID()
  const filePath = await saveFileToDisk(buffer, sourceId, filename)

  const [row] = await db.insert(charter_sources).values({
    id: sourceId,
    org_id: orgId,
    source_type: sourceType,
    raw_file_path: filePath,
    status: "pending"
  }).returning({
    id: charter_sources.id, org_id: charter_sources.org_id
  });
  if (!row) throw new Error("insert into charter_sources returned no rows at all!!");

  return {id: row.id, org_id: row.org_id, file_path: filePath}

}