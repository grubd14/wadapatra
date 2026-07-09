import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name_np: text('name_np').notNull(),
  name_en: text('name_en'),
  type: text('type'),
  district: text('district'),
  province: text('province'),
  website: text('website'),
  created_at: timestamp('created_at').defaultNow()
})
