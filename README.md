# Ticket QR Code Generator Worker: Architecture (ENG-139055)

Planning deliverable: definitive database schema (ERD) and API contracts. No feature code yet.

## Contents

| Path | What it is |
| --- | --- |
| `db/schema.sql` | Definitive SQL schema |
| `docs/ERD.md` | ERD (Mermaid) and design decisions |
| `api/openapi.yaml` | API contracts (OpenAPI 3) |
| `tests/schema.test.js` | Vitest suite verifying schema rules |
| `docs/index.html` | Static page published as the live link |
| `PROMPTS.md` | Prompt log for Antigravity |

## Run

```bash
npm install
npm test
npm run lint
```

## Edge cases covered at the data layer

- **Empty states**: list endpoints return `items: []`; the UI shows "No data found".
- **Bad connectivity**: `Idempotency-Key` makes retries safe; the job table tracks attempts and errors.
- **Invalid inputs**: CHECK/UNIQUE/FK constraints reject bad data; the API returns `fields[]` so the UI can highlight them in red.
- **Security**: all text inputs are sanitized before storage (API contract note).
- **Telemetry**: `analytics_events` backs the `[Analytics] ...` console ping.