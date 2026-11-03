import { createInsertSchema } from "drizzle-orm/zod";
import { z } from "zod";
import { services } from "../db/schema.js";
import { extractFromImage } from "../extractors/image_ocr.js";
import { detectSourceType, saveUpload } from "./upload.js";
import {
  extractServicesFromMarkDownTables,
  ocrPdf,
} from "../extractors/local_pdf_ocr.js";

//zod validation schema based on drizzle table
export const rawServiceSchema = createInsertSchema(services)
  .pick({
    section: true,
    service_name_np: true,
    service_name_en: true,
    hours: true,
    fee_amount: true,
    fee_notes: true,
    location: true,
    contact_person: true,
    contact_phone: true,
    responsible_officer: true,
    grievance_officer: true,
    documents_required: true,
    notes: true,
    raw_json: true,
    review_status: true,
  })
  .strict();

//infering of zod schema
export type RawService = z.infer<typeof rawServiceSchema>;

//interface defining expected shape returned by the function
// rejected: to include malformed data
export interface ExtractionResult {
  services: {
    raw: unknown;
    service: RawService;
  }[];

  rejected: {
    raw: unknown;
    reason: string;
  }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


export function parseExtraction(input: unknown): ExtractionResult {
  if(Array.isArray(input)) input = { services: input };
  //containers for valid and invalid services
  const services: ExtractionResult["services"] = [];
  const rejected: ExtractionResult["rejected"] = [];

  //check the outer API response
  // safe parse the API response
  const responseResult = z
    .object({
      services: z.array(z.unknown()),
    })
    .safeParse(input);

  if (!responseResult.success) {
    throw new Error("Invalid extraction response: expected a services array");
  }

  //process each extracted service separately
  const candidateService = responseResult.data.services;
  for (const candidate of candidateService) {
    if (!isRecord(candidate)) {
      rejected.push({
        raw: candidate,
        reason: "expected service object",
      });

      continue;
    }

    //parsed data
    const parsed = rawServiceSchema.safeParse(candidate);

    if (!parsed.success) {
      rejected.push({
        raw: candidate,
        reason: parsed.error.message,
      });

      continue;
    }

    services.push({
      raw: candidate,
      service: parsed.data,
    });
  }
  return {
    services,
    rejected,
  };
}

export async function processUpload(
  orgId: string,
  buffer: Buffer,
  filename: string,
) {
  const savedPath = await saveUpload({ orgId, buffer, filename });

  //condition ? true : false
  //ternary operator to store extraction value
  const raw =
    detectSourceType(filename) === "pdf"
      ? await extractServicesFromMarkDownTables(
          await ocrPdf(savedPath.file_path),
        )
      : await extractFromImage(savedPath.file_path);

  const results = parseExtraction(raw);
  console.log(results);
  return {
    savedPath,
    results,
  };
}
