# CommentMaker

AI-assisted Canvas LMS feedback drafting tool. Generates draft assignment comments in the teacher's voice, with the teacher always in control of what gets posted.

## Quick Start

```bash
npm install
cp .env.example .env.local   # edit with your values
npm run dev                   # http://localhost:3000
```

## How It Works

1. Enter your Canvas token and instance URL.
2. Select a course, a current assignment (to grade), and a reference assignment (to learn your style).
3. The app fetches submissions and generates draft comments using an LLM.
4. Review and edit each draft, then post approved comments back to Canvas.

## Architecture

- **Next.js App Router** with server-side route handlers for all Canvas/LLM calls.
- Canvas tokens and LLM keys stay server-side; never sent to the browser or logged.
- PII redaction runs before every LLM call.
- Dry-run mode available to preview without posting.

See [DECISIONS.md](DECISIONS.md) for architecture rationale and [STATUS.md](STATUS.md) for current progress.
