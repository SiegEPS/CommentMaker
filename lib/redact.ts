/**
 * Basic PII redaction for submission text before LLM calls.
 * Strips known identifiers: names, emails, Canvas IDs.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CANVAS_ID_RE = /\b\d{5,10}\b/g; // heuristic for numeric IDs

export interface StudentInfo {
  name: string;
  userId: number;
  sisId?: string;
  email?: string;
}

/** Remove known PII from text. Returns redacted copy. */
export function redact(text: string, students: StudentInfo[]): string {
  let result = text;

  for (const s of students) {
    // Replace full name and individual name parts (case-insensitive)
    if (s.name) {
      result = result.replace(new RegExp(escapeRegex(s.name), "gi"), "[STUDENT]");
      for (const part of s.name.split(/\s+/)) {
        if (part.length >= 3) {
          result = result.replace(new RegExp(`\\b${escapeRegex(part)}\\b`, "gi"), "[STUDENT]");
        }
      }
    }
    if (s.email) {
      result = result.replace(new RegExp(escapeRegex(s.email), "gi"), "[EMAIL]");
    }
    if (s.sisId) {
      result = result.replace(new RegExp(escapeRegex(s.sisId), "g"), "[SIS_ID]");
    }
    result = result.replace(new RegExp(`\\b${s.userId}\\b`, "g"), "[USER_ID]");
  }

  // Generic patterns
  result = result.replace(EMAIL_RE, "[EMAIL]");

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
