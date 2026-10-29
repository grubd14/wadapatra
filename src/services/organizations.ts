import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { db } from "../db/index.js";
import { organizations } from "../db/schema.js";
import {z} from "zod";

// const { createInsertSchema, createSelectSchema } = createSchemaFactory()

export const createOrgBody = createInsertSchema(organizations).pick({
  name_en: true,
  name_np: true,
  type: true,
  district: true,
  province: true,
  website: true,
})

export const selectOrg = createSelectSchema(organizations)
export const orgList = selectOrg.array()

export type CreateOrgInput = z.infer<typeof createOrgBody>

export async function createOrganization(organizations_input: CreateOrgInput) {
  const [org] = await db.insert(organizations).values(organizations_input).returning()
  if (!org) throw new Error("insert into organizations returned no row")
  return org
}

export async function listOrganization() {
  return db.select().from(organizations)
}