# CommentMaker: AI-Assisted Canvas Feedback Drafting

## 0. Purpose (One Sentence)
A teacher-facing web app that drafts assignment feedback in the teacher’s voice using Canvas LMS data, while keeping students’ PII out of LLM calls and keeping the teacher in control of what gets posted.

## 1. Target Users
- Primary: Teachers grading in Canvas LMS.
- Secondary: Instructional coaches / department leads (optional future role).

## 2. In-Scope Outcomes (v1)
1) Teacher connects to Canvas using a Canvas access token.
2) Teacher selects:
   - Course
   - Assignment to grade (current)
   - Reference assignment (prior) used only to learn tone/style patterns
3) App fetches rubric + submissions + existing teacher comments for the reference assignment.
4) App generates **draft** feedback comments for each student submission in the current assignment.
5) Teacher reviews/edits each draft.
6) On approval, app posts the comment back to the correct Canvas submission.

## 3. Out of Scope (v1)
- Automatic grading/score changes without teacher approval.
- Fully automated posting without review.
- Long-term storage/analytics on student work.
- Support for every possible Canvas submission type and edge case.

## 4. Key Product Decisions (Must Be Explicit)
### 4.1 Architecture Choice
- Default: **Server-mediated** architecture (recommended):
  - Canvas token and LLM keys are stored server-side encrypted at rest.
  - All Canvas API calls happen from server to avoid CORS and to centralize rate limiting.
  - LLM calls happen server-side with strict redaction and logging controls.
- Alternative (not default): Client-only mode may be explored later.

### 4.2 PII Policy
- Goal: Do not send direct identifiers to LLM endpoints.
- “Direct identifiers” include: student name, SIS ID, email, Canvas user ID, and any roster-derived identifiers.
- v1 supports text extraction from:
  - Canvas submission body text
  - Plain text attachments (.txt)
  - (Optional) .pdf and .docx only if a reliable text extraction + metadata stripping pipeline exists.
- If submission content cannot be confidently de-identified, the app must:
  - Flag it as “Manual review required”
  - Allow teacher to view submission in app
  - Skip LLM generation unless teacher explicitly overrides with a warning

## 5. Functional Requirements

### 5.1 Authentication & Setup
- FR-1: Teacher can enter a Canvas token and select a Canvas instance base URL.
- FR-2: Teacher can enter API keys for one or more LLM providers (OpenAI / Anthropic / Google).
- FR-3: Keys must never be logged. UI should allow key rotation and removal.

### 5.2 Canvas Data Selection
- FR-4: Teacher can list active courses they teach (pagination supported).
- FR-5: Teacher can select a course and list assignments (pagination supported).
- FR-6: Teacher selects:
  - Current assignment (to draft comments for)
  - Reference assignment (to learn style)

### 5.3 Reference Style Extraction
- FR-7: App fetches a configurable number (default 20) of the teacher’s historical comments from the reference assignment.
- FR-8: App transforms these comments into a **Style Guide**:
  - tone descriptors (e.g., “warm, direct”)
  - typical structure (e.g., “praise → critique → next steps”)
  - common phrases (only if not student-specific)
- FR-9: Style Guide must exclude student-identifying content and avoid quoting historical comments verbatim.

### 5.4 Rubric & Requirements Context
- FR-10: App fetches rubric criteria (if present) for the current assignment.
- FR-11: Teacher can choose whether the rubric is:
  - required context for the model
  - displayed only to the teacher (no LLM use)
- FR-12: Teacher can add optional “assignment expectations” notes (free text) that are included in prompts.

### 5.5 Submission Ingestion
- FR-13: App lists students/submissions for the current assignment and their status (submitted/missing/late).
- FR-14: For each submission, app extracts analyzable text:
  - from submission body, and/or attachments
  - records extraction confidence and warnings
- FR-15: App supports multiple attempts; teacher selects latest or specific attempt (default latest).

### 5.6 Draft Comment Generation
- FR-16: Teacher selects LLM provider + model + generation settings (temperature, max tokens) within safe bounds.
- FR-17: App generates a draft comment per submission using:
  - extracted submission text (redacted)
  - rubric criteria (if enabled)
  - Style Guide
  - teacher expectations notes (optional)
- FR-18: Each draft includes:
  - the draft comment
  - a “why” summary (brief) indicating which rubric items were addressed
  - confidence / “needs review” flags

### 5.7 Review & Posting
- FR-19: Teacher can review drafts in a fast workflow (next/prev, list view).
- FR-20: Teacher can edit drafts before posting.
- FR-21: Posting is explicit per student (or batch with per-student confirmation).
- FR-22: After posting, app shows success/failure with retry guidance.

## 6. Non-Functional Requirements

### 6.1 Security
- NFR-1: No secrets in logs. No secrets in client storage by default.
- NFR-2: Encrypt stored tokens/keys at rest (server).
- NFR-3: Use least-privilege access: Canvas token should only be able to access needed scopes.

### 6.2 Compliance / Data Handling
- NFR-4: Default: do not persist student submissions. Process in-memory; discard after generation.
- NFR-5: Maintain a minimal audit log of actions (e.g., “comment posted to submission X”) without storing submission content.

### 6.3 Reliability & Rate Limits
- NFR-6: Canvas API calls must handle pagination and rate limiting (backoff + jitter).
- NFR-7: LLM calls must handle timeouts/retries and have a per-session cost budget.

### 6.4 UX Performance
- NFR-8: Support batch grading: generate drafts in configurable batches (e.g., 5–10 at a time).
- NFR-9: UI remains responsive during batch generation (progress indicators, cancel).

## 7. External Integrations: Canvas API Interaction Map (Initial)
(Exact endpoint list to be finalized during implementation; must support pagination.)
- Courses list (teacher’s active courses)
- Assignments list (by course)
- Submissions list (by assignment)
- Rubric criteria (if available)
- Submission details + attachments
- Post submission comment (approved drafts)

## 8. Prompting & Redaction Requirements
- PR-1: A redaction step runs before every LLM call.
- PR-2: Redaction must remove identifiers from:
  - roster data
  - submission text
  - attachment text (and metadata where possible)
- PR-3: The prompt must instruct the model:
  - never to invent student-specific facts
  - to write actionable, rubric-aligned feedback
  - to keep tone consistent with the Style Guide

## 9. Acceptance Criteria (v1)
- AC-1: Teacher can connect and select course + current assignment + reference assignment.
- AC-2: App generates drafts for at least N submissions (configurable) without crashes.
- AC-3: Teacher can edit and post a comment to Canvas and verify it appears on the submission.
- AC-4: App never sends roster identifiers (names/emails/IDs) to any LLM provider.
- AC-5: Rate limiting does not break the session; user sees clear errors and can retry.

## 10. Known Risks / Roadblocks
- R-1: De-identifying free-form student text is imperfect; require “manual review required” fallback.
- R-2: Attachment parsing for .pdf/.docx can leak metadata; may need to restrict file support in v1.
- R-3: Canvas permissions differ by district configuration; tokens may not access needed endpoints.
- R-4: Costs can scale quickly; require batching + budgets + visible token usage estimates.
