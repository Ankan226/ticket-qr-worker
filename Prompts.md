# PROMPTS.md: Antigravity Prompt Log

Ticket: ENG-139055 | Owner: Ankan Pal


## Prompt 1: Context
"You are my senior engineer. I am the Product Manager. Project: Ticket QR Code Generator Worker. Deliverable is ARCHITECTURE ONLY: a database schema (ERD) and API contracts, no feature code. Edge cases: empty states, bad connectivity (retry safety), invalid input. Security: XSS sanitization. Telemetry: simulated analytics ping. Confirm you understand and list your assumptions."


## Prompt 2: Tests first (TDD)
"Before writing any schema, write a Vitest suite (using sql.js) that verifies: expected tables exist, invalid roles and statuses are rejected, duplicate ticket codes are rejected, foreign keys are enforced, duplicate idempotency keys are rejected, only one active QR code per ticket, and an empty event returns zero tickets. Do not write the schema yet."


## Prompt 3: Schema
"Now write db/schema.sql (SQLite dialect) so every test passes. Use CHECK, UNIQUE and FOREIGN KEY constraints, a partial unique index for active QR codes, and indexes for common queries."


## Prompt 4: ERD
"Produce docs/ERD.md with a Mermaid erDiagram of all tables and a short list of design decisions."


## Prompt 5: API contracts
"Write api/openapi.yaml (OpenAPI 3.0.3) for: list tickets, create ticket, request QR job with Idempotency-Key, poll job, get QR, validate scan, analytics ping. Include a standard error body with a fields[] array for highlighting invalid inputs, and make list endpoints return empty arrays."


## Prompt 6: Static page
"Create docs/index.html: monochrome design using only CSS variables (no rogue hex colors), 16px/32px spacing, semantic landmarks, skip link, a visible focus outline, and the ERD rendered with Mermaid. Target a 100% Lighthouse accessibility score."


## Prompt 7: Lint
"Set up ESLint 9 flat config with zero warnings allowed and fix any unused imports."


## Iteration rule used
When something broke, I pasted the error and said: "That approach caused an error. Let's revert and try a different method."