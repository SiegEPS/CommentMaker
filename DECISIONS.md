# Architecture Decisions

## D1: Server-mediated architecture
- **Choice**: All Canvas and LLM API calls go through Next.js route handlers.
- **Why**: Avoids CORS issues, centralizes rate limiting, keeps tokens server-side.
- **Trade-off**: Requires a running server (no static export).

## D2: No database for v1
- **Choice**: Tokens stored in encrypted HTTP-only cookies. No DB.
- **Why**: Simplicity. Single-teacher local use doesn't need persistence.
- **Trade-off**: Session lost on cookie expiry; no multi-user support.

## D3: Online text submissions only (v1)
- **Choice**: Only `online_text_entry` Canvas submission type supported.
- **Why**: PDF/DOCX parsing adds complexity and metadata-leak risk (R-2).
- **Trade-off**: Teachers using file uploads must wait for v2.

## D4: LLM calls stubbed initially
- **Choice**: Placeholder deterministic comments; real LLM integration added later.
- **Why**: Lets us validate the full Canvas flow end-to-end first.

## D5: PII redaction before LLM
- **Choice**: Regex-based stripping of names, emails, IDs before any LLM call.
- **Why**: Meets AC-4. Simple approach sufficient for text submissions.
- **Trade-off**: Won't catch all indirect identifiers in free text (R-1).

## D6: Dry-run mode
- **Choice**: Client-side toggle that prevents the POST to Canvas.
- **Why**: Safe testing without affecting real submissions.

## D7: Next.js App Router + TypeScript + Tailwind
- **Choice**: Modern Next.js stack with type safety.
- **Why**: Fast iteration, good DX, server components for data fetching.
