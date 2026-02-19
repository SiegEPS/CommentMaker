import { GoogleGenAI } from "@google/genai";

export interface GenerateRequest {
  submissionText: string;
  rubric?: string;
  styleGuide?: string;
  teacherNotes?: string;
}

export interface GenerateResult {
  draft: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

function buildPrompt(req: GenerateRequest): string {
  let prompt = `You are a teacher writing feedback on a student's assignment submission.
Write a constructive, specific comment that:
- Acknowledges what the student did well
- Identifies areas for improvement with actionable suggestions
- Is warm but direct in tone

STUDENT SUBMISSION:
${req.submissionText}`;

  if (req.rubric) {
    prompt += `\n\nRUBRIC CRITERIA:\n${req.rubric}`;
  }
  if (req.styleGuide) {
    prompt += `\n\nSTYLE GUIDE (match this tone and structure):\n${req.styleGuide}`;
  }
  if (req.teacherNotes) {
    prompt += `\n\nTEACHER NOTES:\n${req.teacherNotes}`;
  }

  prompt += `\n\nIMPORTANT:
- Do NOT invent facts about the student or their work.
- Do NOT reference the student by name.
- Keep the comment to 2-4 paragraphs.

Respond with ONLY raw JSON (no markdown fences, no extra text):
{"draft": "your comment here", "reasoning": "brief explanation of what rubric items you addressed", "confidence": "high|medium|low"}`;

  return prompt;
}

export async function generateDraftComment(
  req: GenerateRequest
): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Fallback to stub if no key configured
    const wordCount = req.submissionText.split(/\s+/).length;
    return {
      draft: `[STUB] Good work on this submission (~${wordCount} words). Consider expanding your main argument with specific examples.`,
      reasoning: "Stub: no GEMINI_API_KEY configured.",
      confidence: "low",
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildPrompt(req),
    config: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  const text = response.text ?? "";

  // Strip markdown fences if present (```json ... ``` or ``` ... ```)
  const fenceStripped = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

  // Try to parse as JSON
  const jsonMatch = fenceStripped.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        draft: parsed.draft ?? text,
        reasoning: parsed.reasoning ?? "",
        confidence: parsed.confidence ?? "medium",
      };
    } catch {
      // Fall through to raw text handling
    }
  }

  // If JSON parsing fails, use raw text as draft
  return {
    draft: fenceStripped.trim() || text,
    reasoning: "Response was not structured JSON; using raw output.",
    confidence: "low",
  };
}
