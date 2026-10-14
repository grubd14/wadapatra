import { pgTable, uuid, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";

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


export const charter_sources = pgTable('charter_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  source_url: text('source_url'),
  source_type: text('source_type').notNull(),   // 'pdf' | 'image' | 'html' | 'manual'
  raw_file_path: text('raw_file_path'),
  status: text('status').default('pending'),    // 'pending' | 'approved' | 'stale'
  last_extracted: timestamp('last_extracted'),
  last_verified: timestamp('last_verified')
})

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  source_id: uuid('source_id').references(() => charter_sources.id).notNull(),
  section: text('section'),                     // floor/department grouping, if any
  service_name_np: text('service_name_np').notNull(),
  service_name_en: text('service_name_en'),
  hours: text('hours'),
  fee_amount: numeric('fee_amount'),
  fee_notes: text('fee_notes'),
  location: text('location'),
  contact_person: text('contact_person'),
  contact_phone: text('contact_phone'),
  responsible_officer: text('responsible_officer'),
  grievance_officer: text('grievance_officer'),
  documents_required: text('documents_required'),
  notes: text('notes'),
  raw_json: jsonb('raw_json'),
  review_status: text('review_status').default('pending'),  // 'pending' | 'approved' | 'flagged'
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
})