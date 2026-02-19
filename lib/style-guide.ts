import { GoogleGenAI } from "@google/genai";

/**
 * Analyze teacher comments from a reference assignment and produce
 * a concise style guide for draft comment generation.
 */
export async function extractStyleGuide(
  comments: string[]
): Promise<string> {
  if (comments.length === 0) {
    return "";
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "[Style guide unavailable — no GEMINI_API_KEY configured]";
  }

  // Take up to 20 comments (FR-7 default)
  const sample = comments.slice(0, 20);

  const prompt = `You are analyzing a teacher's feedback comments to extract their writing style.

Below are ${sample.length} comments this teacher has written on student work. Analyze them and produce a concise STYLE GUIDE that captures:

1. **Tone**: Describe the overall tone (e.g., warm, formal, encouraging, direct, conversational)
2. **Structure**: What pattern do the comments follow? (e.g., praise → constructive feedback → next steps)
3. **Common phrases**: List 3-5 phrases or sentence patterns this teacher frequently uses (do NOT include any student names or identifying info)
4. **Length**: Typical comment length (brief, moderate, detailed)

TEACHER COMMENTS:
${sample.map((c, i) => `--- Comment ${i + 1} ---\n${c}`).join("\n\n")}

IMPORTANT:
- Do NOT include any student names, IDs, or identifying information in the style guide.
- Do NOT quote comments verbatim — only describe patterns.
- Keep the style guide to 5-10 bullet points.
- Respond with ONLY the style guide text, no JSON or markdown fences.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  return response.text ?? "";
}
