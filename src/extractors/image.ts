//image extraction using mistral AI
import fs from "fs"; //file system module of node
import { client } from "../extractors/mistral.js";

//extraction prompt
const extractionPrompt = `
  You are extracting data from a government citizens charter document. It may be
  written in Nepali, English, or a mix of both, and every department uses different
  column headers — do not rely on matching exact words. Instead, understand what each
  column actually MEANS and map it to the closest matching field below.

  TARGET FIELDS AND THEIR MEANING:

  - service_name_np: the name/description of the service, in its original script if Nepali
  - service_name_en: an English name for the service, if given directly or you can confidently translate it
  - section: a grouping label if services are organized under a heading (floor name, department
    name, category). Repeat this value for every row under that heading.
  - hours: how long the service takes, or when it's available — processing time, working days,
    operating hours (e.g. "12 working days", "9:00-3:00", "24 hours")
  - fee_notes: cost/charge/fee information, copied exactly as written including currency and conditions
  - location: WHERE to physically go — room number, floor, counter, section, "contact room",
    reception, or any place name mentioned for visiting
  - contact_person: WHO to go to or contact for help with this specific service — this covers
    columns like "Contact Person", "In Case of Queries", "In Case of Any Queries",
    "Concerned Section Head", "Duty Staff", or similar. This is the default home for any
    "who do I ask" column unless the document is SPECIFICALLY about filing a formal complaint.
  - responsible_officer: the officer/role formally accountable for delivering the service —
    only fill this if the document draws a clear, separate distinction from contact_person
  - grievance_officer: ONLY the specific role for handling formal complaints/grievances about
    the service (e.g. "उजुरी सुन्ने अधिकारी", "Grievance Officer", "Complaint Officer").
    Do not put general "contact" or "queries" columns here — those belong to contact_person.
  - documents_required: any list of required documents, papers, or forms needed for the service
  - notes: anything relevant that doesn't fit a field above — footnotes, asterisked conditions,
    special instructions, or a column you genuinely can't place elsewhere (in that case, prefix
    it with the original column header so nothing is lost, e.g. "Note: ...")

  MAPPING RULES:
  - Each distinct service/row in the table becomes one JSON object
  - Look at the actual column header AND the kind of data in the cell together — a column
    literally labeled "Contact Room" is a location, not a person, even if it contains the
    word "Contact"
  - If a cell is merged across multiple rows, repeat its value for each affected row
  - If a field has no data for a given service, omit that key entirely — never write null,
    "N/A", or an empty string
  - Preserve fee/currency values exactly as written, do not reformat or convert them
  - If you genuinely cannot confidently map a column to any field above, put its content in
    "notes" rather than forcing it into the wrong field

  Return ONLY a valid standard JSON array. Not JSON5, just strict JSON. No comments, no trailing
  commas, no unquoted keys, no single-quoted strings. No explanation. No markdown code fences.
  `;

//encode the image to base64
function encodeImage(imagePath: string) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  return `data:image/png;base64,${base64Image}`;
}

/**
 * Extract services from a local image file.
 * Returns the raw parsed JSON — hand it to parseExtraction() for validation.
 */
export async function extractFromImage(imagePath: string) {
  const response = await client.chat.complete({
    model: "mistral-medium-latest",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: extractionPrompt },
          { type: "image_url", imageUrl: encodeImage(imagePath) },
        ],
      },
    ],
    responseFormat: {
      type: "json_object",
    },
  });

  const content = response.choices?.[0]?.message?.content ?? "";
  if (typeof content !== "string") return content;

  try {
    return JSON.parse(content);
  } catch (err) {
    // Hand the unparsed string back so parseExtraction() can report it as a reject
    // instead of losing the response entirely.
    console.error("Image extraction returned invalid JSON:", err);
    return content;
  }
}
