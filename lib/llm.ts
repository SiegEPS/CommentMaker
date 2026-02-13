/**
 * LLM stub — returns deterministic placeholder comments.
 * Will be replaced with real provider calls later.
 */

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

export async function generateDraftComment(
  req: GenerateRequest
): Promise<GenerateResult> {
  // Stub: return a placeholder based on input length
  const wordCount = req.submissionText.split(/\s+/).length;
  const detail = wordCount > 100 ? "detailed" : "brief";

  return {
    draft: `[DRAFT] Good work on this ${detail} submission. Consider expanding on your main argument and providing more specific examples to strengthen your analysis. Keep up the effort!`,
    reasoning: `Stub comment generated for a ${wordCount}-word submission. Rubric: ${req.rubric ? "provided" : "none"}. Style guide: ${req.styleGuide ? "provided" : "none"}.`,
    confidence: "medium",
  };
}
