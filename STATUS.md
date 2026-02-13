# Project Status

## Current State: Minimum Vertical Slice Complete

### Done
- [x] Requirements defined (requirements.md)
- [x] Implementation plan approved
- [x] Scaffold files (README, DECISIONS, STATUS, .gitignore, .env.example)
- [x] Next.js 15 app with TypeScript + Tailwind 4
- [x] Canvas API helper with pagination + rate-limit backoff (`lib/canvas.ts`)
- [x] Route handlers: courses, assignments, submissions, comment, generate
- [x] LLM stub returning placeholder comments (`lib/llm.ts`)
- [x] PII redaction module (`lib/redact.ts`)
- [x] Single-page wizard UI (setup → course → assignments → drafts)
- [x] Dry-run toggle (prevents posting to Canvas)
- [x] Build passes cleanly

### Next Up
- [ ] Wire up real LLM providers (OpenAI / Anthropic / Google)
- [ ] Style guide extraction from reference assignment comments
- [ ] Rubric context integration
- [ ] Batch generation with progress UI
- [ ] PDF/DOCX submission support
- [ ] Git init + first commit
