import { NextRequest, NextResponse } from "next/server";
import { generateDraftComment } from "@/lib/llm";
import { redact, StudentInfo } from "@/lib/redact";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    submissions,
    students,
    rubric,
    styleGuide,
    teacherNotes,
  }: {
    submissions: { userId: number; text: string }[];
    students: StudentInfo[];
    rubric?: string;
    styleGuide?: string;
    teacherNotes?: string;
  } = body;

  if (!submissions?.length) {
    return NextResponse.json({ error: "No submissions provided" }, { status: 400 });
  }

  const drafts = await Promise.all(
    submissions.map(async (sub) => {
      const redactedText = redact(sub.text, students);
      const result = await generateDraftComment({
        submissionText: redactedText,
        rubric,
        styleGuide,
        teacherNotes,
      });
      return { userId: sub.userId, ...result };
    })
  );

  return NextResponse.json({ drafts });
}
