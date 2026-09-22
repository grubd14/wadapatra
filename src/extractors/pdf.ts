import fs from "fs";
import { client } from "./mistral.js";

export const htmlExtractionPrompt = `
  You will receive a JSON array of HTML table fragments. These fragments are NOT
  separate tables — they are consecutive page-chunks of ONE continuous table that
  was split apart by page breaks during OCR. Process them as a single logical table,
  in the array order given.
  
  STEP 1 — Reconstruct the table before extracting anything:
  - Only the first chunk may contain a <thead>/header row. Remember those column
    meanings and apply them to every chunk that follows, even though later chunks
    have no header of their own.
  - A row where the first one or more <td> cells are empty is NOT a new service.
    It is the continuation of the LAST row from the previous chunk, cut off by a
    page break. Merge its non-empty cell content onto the end of the corresponding
    field of that previous row (e.g. append to documents_required with a space or
    line break) rather than creating a new record.
  - A cell with a rowspan attribute applies to that many rows below it — repeat its
    value for each row it spans.
  - After merging continuations, you should have one row per actual distinct service.
  
  STEP 2 — Map each column to the closest matching field below by MEANING, not by
  matching header text literally. Header wording is sometimes inaccurate or
  misleading — always check what the actual cell values contain and let that guide
  you, not just the header label:
  
  - section: a branch/department/office name repeated across many rows (e.g. "शाखा" /
    "करदाता सेवा शाखा", "संकलन शाखा") — this identifies which office unit handles the
    service, not the service itself
  - service_name_np: the name/description of the service itself
  - documents_required: the list of required documents/papers/process steps
  - fee_notes: cost/charge information, copied exactly as written (e.g. "निशुल्क" means
    free — keep it as written, don't translate it away)
  - hours: processing time / turnaround / working days
  - location: room numbers, counter numbers, or physical places to visit — including
    a column titled around "responsible officer's room/counter" if its actual values
    are just room numbers rather than a person's name or title
  - responsible_officer or grievance_officer: use ONLY if the cell's actual content is
    a role/title (e.g. "प्रमुख कर अधिकृत") describing a person, not a bare room number.
    If a cell has a role title with a room number in parentheses like
    "प्रमुख कर अधिकृत (कोठा नं ४०१)", put the full text in grievance_officer if the
    column is about complaints, or contact_person if the column is a general contact —
    do not also duplicate the parenthetical room number into location unless it's a
    DIFFERENT room from what's already in location for that row.
  - notes: a serial number column, or anything you can't confidently place elsewhere
  
  STEP 3 — Output rules:
  - Each merged, reconstructed service becomes one JSON object
  - Omit any key with no data for that service — never write null or an empty string
  - Preserve Nepali text and numerals exactly as written, do not transliterate or
    convert Devanagari numerals to Arabic numerals
  - Return ONLY a valid standard JSON array.Not JSON5 just JSON. No explanation. No markdown code fences.
  `;

export function encodePdf(pdfPath: string) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Pdf = pdfBuffer.toString("base64");
  return `data:application/pdf;base64,${base64Pdf}`;
}

/**
 * OCR a PDF into HTML table fragments. This is the expensive, cacheable step —
 * call it once per source and persist the result rather than re-paying for it.
 */
export async function ocrPdf(pdfPath: string) {
  const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: encodePdf(pdfPath),
    },
    tableFormat: "html",
  });
  return ocrResponse;
}

/** Flatten an OCR response into the single JSON array of HTML tables the prompt expects. */
export function getOcrTables(ocrResponse: Awaited<ReturnType<typeof ocrPdf>>) {
  return JSON.stringify(ocrResponse.pages.flatMap((page) => page?.tables ?? []));
}

/**
 * Ask the LLM to reconstruct + extract the already-OCR'd tables.
 * Returns the raw parsed JSON — hand it to parseExtraction() for validation.
 */
export async function extractServicesFromTables(
  tablesJson: string,
  prompt: string = htmlExtractionPrompt,
) {
  const chatResponse = await client.chat.complete({
    model: "mistral-medium-latest",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: tablesJson },
          { type: "text", text: prompt },
        ],
      },
    ],
    responseFormat: { type: "json_object" },
  });

  const content = chatResponse.choices[0]?.message?.content ?? "";
  if (typeof content !== "string") return content;

  try {
    return JSON.parse(content);
  } catch (error) {
    // Hand the unparsed string back so parseExtraction() can report it as a reject
    // instead of losing the response entirely.
    console.error("PDF extraction returned invalid JSON:", error);
    return content;
  }
}
