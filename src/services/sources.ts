import { charter_sources } from "../db/schema.js";
import { z } from "zod";
import { db } from "../db/index.js";
import { createSchemaFactory } from "drizzle-orm/zod";

const { createInsertSchema, createSelectSchema } = createSchemaFactory()

export const createSourceBody = createInsertSchema(charter_sources).pick({
  org_id: true,
  source_url: true,
  source_type: true,
  raw_file_path: true,
  status: true,
})

export const selectSources = createSelectSchema(charter_sources)
export const sourcesList = selectSources.array()

export type CreateSourceInput = z.infer<typeof createSourceBody>

export async function createSource(sources_input: CreateSourceInput) {
  const [sources] = await db.insert(charter_sources).values(sources_input).returning()
  if (!sources) throw new Error("insert into charter_sources returned no row")
}

export async function listSources() {
  return db.select().from(charter_sources)
}
