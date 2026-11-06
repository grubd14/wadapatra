# Wadapatra

E-governance platform for Citizens' Charters. Upload a charter (PDF or image, often in Nepali) and the services in it are extracted into structured database records.

## How it works

1. Upload a file with an `org_id`.
2. PDFs are converted to Markdown locally with LiteParse. Images are sent straight to the model.
3. Google Gemini maps the content to service fields.
4. Each service is validated with Zod. Invalid ones are returned in a `rejected` list.

## Stack

TypeScript, Fastify, PostgreSQL, Drizzle ORM, Zod, LiteParse, Google Gemini.

## Setup

Requires Node 22+, pnpm, Docker and a Google AI Studio API key.

```bash
pnpm install
cp .env.example .env      # fill in DATABASE_* and GOOGLE_API_KEY
docker compose up -d
npx drizzle-kit migrate
pnpm dev
```

The server runs on `http://localhost:3000`.

## Upload a charter

```bash
curl -F org_id=<organization-uuid> -F file=@charter.pdf http://localhost:3000/uploads/
```

Supported: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`.

## Status

Done:

- Local OCR for PDFs (quality is limited)
- Switched to Google Gemini
- Basic upload
- Basic extraction pipeline

To do:

- Admin and user routes
- Caching for API calls
- API spec
- Basic UI
