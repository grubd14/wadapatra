import fs from "fs";
import { client } from "./gemini-client.js";
import LiteParse from "@llamaindex/liteparse";

const markdownExtractionPrompt = `
  You will receive the Markdown rendering of a government citizens charter PDF,
  produced by a local layout-based parser. It may be in Nepali, English, or a mix.
  Pages are separated by blank lines / "---" markers, and the services usually
  form ONE continuous table that was split across pages. Treat all of it as a
  single logical table, in the order given.

  STEP 1 — Reconstruct the table before extracting anything:
  - Tables appear as Markdown pipe tables ("| a | b |"). Only the first fragment
    normally has a header row (followed by a "| --- | --- |" separator). Remember
    those column meanings and apply them to every later fragment, even though
    later pages repeat or omit the header. If a header row is repeated on a
    later page, ignore the repeat — it is not a service.
  - The parser may not detect the table on some pages and instead emit plain
    lines where columns are separated by wide spacing. Use the column order from
    the header and the kind of data in each cell to realign those lines.
  - A row whose first cells are empty is NOT a new service. It is the continuation
    of the previous row, cut off by a page break or a wrapped cell. Append its
    non-empty cell content to the matching field of the previous row.
  - Markdown has no rowspan. If a cell such as a section/branch name is filled
    only on the first row of a group and blank on the rows below, repeat that
    value for every row in the group.
  - A text cell may be split over several consecutive lines or rows (wrapped
    Nepali text). Join the pieces back into one value with a space.
  - Ignore page numbers, running headers/footers, image placeholders such as
    "![](image_p1_1.png)", and prose paragraphs that are not part of the table.
  - After merging, you should have one row per distinct service.

  STEP 2 — Map each column to the closest matching field below by MEANING, not by
  matching header text literally. Header wording can be inaccurate, and OCR may
  garble it — always check what the cell values contain:

  - section: a branch/department/office name repeated across many rows (e.g. "शाखा" /
    "करदाता सेवा शाखा") — the office unit handling the service, not the service itself
  - service_name_np: the name/description of the service itself
  - service_name_en: an English name, only if given or confidently translatable
  - documents_required: the list of required documents/papers/process steps
  - fee_notes: cost/charge information, copied exactly as written (e.g. "निशुल्क"
    means free — keep it as written, don't translate it away)
  - hours: processing time / turnaround / working days / operating hours
  - location: room numbers, counter numbers, or physical places to visit — including
    a column titled around "responsible officer's room/counter" if its actual values
    are just room numbers rather than a person's name or title
  - contact_person: who to contact for this service (general "who do I ask" columns)
  - responsible_officer or grievance_officer: use ONLY if the cell's content is a
    role/title (e.g. "प्रमुख कर अधिकृत") describing a person, not a bare room number.
    For "प्रमुख कर अधिकृत (कोठा नं ४०१)", put the full text in grievance_officer if the
    column is about complaints, or contact_person if it is a general contact — do not
    also copy the parenthetical room number into location unless it is a DIFFERENT
    room from what is already in location for that row.
  - notes: a serial-number column, footnotes, or anything you can't confidently place

  STEP 3 — Output rules:
  - Return a single JSON object of the form {"services": [ ... ]}, where each
    merged, reconstructed service is one object in the array
  - Omit any key with no data for that service — never write null, "N/A" or an empty string
  - Preserve Nepali text and numerals exactly as written, do not transliterate or
    convert Devanagari numerals to Arabic numerals
  - Strip Markdown syntax (pipes, **bold**, <br>) from values; keep only the text
  - Return ONLY valid standard JSON. Not JSON5. No explanation. No markdown code fences.
  `;


/**
 * OCR a PDF into HTML table fragments. This is the expensive, cacheable step —
 * call it once per source and persist the result rather than re-paying for it.
 */
export async function ocrPdf(pdfPath: string) {
  const localParser = new LiteParse({
    outputFormat: "markdown",
    ocrEnabled: true,
    ocrLanguage: "nep",
    imageMode: "off",
    extractLinks: false,
  })
  const ocrResponse = await localParser.parse(fs.readFileSync(pdfPath))
  return ocrResponse.text;
}

/**
 * Ask the LLM to reconstruct + extract the already-OCR'd tables.
 * Returns the raw parsed JSON — hand it to parseExtraction() for validation.
 */
export async function extractServicesFromMarkDownTables(
  tablesJson: string,
  prompt: string = markdownExtractionPrompt,
) {
  const chatResponse = await client.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: [{ text: tablesJson }, { text: prompt }],
    config: {responseMimeType: "application/json"},
  });

  const content = chatResponse.text ?? "";

  try {
    return JSON.parse(content);
  } catch (error) {
    // Hand the unparsed string back so parseExtraction() can report it as a reject
    // instead of losing the response entirely.
    console.error("PDF extraction returned invalid JSON:", error);
    return content;
  }
}
