import { NextRequest, NextResponse } from "next/server";
import { listSubmissions } from "@/lib/canvas";
import { redact, StudentInfo } from "@/lib/redact";
import { extractStyleGuide } from "@/lib/style-guide";

export async function POST(req: NextRequest) {
  const baseUrl = req.headers.get("x-canvas-url");
  const token = req.headers.get("x-canvas-token");

  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Missing Canvas credentials" }, { status: 400 });
  }

  const { courseId, assignmentId, teacherId } = await req.json();

  if (!courseId || !assignmentId || !teacherId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const submissions = await listSubmissions(
      { baseUrl, token },
      Number(courseId),
      Number(assignmentId),
      true // includeComments
    );

    // Collect teacher-authored comments only
    const students: StudentInfo[] = submissions
      .filter((s) => s.user)
      .map((s) => ({
        name: s.user!.name,
        userId: s.user_id,
      }));

    const teacherComments: string[] = [];
    for (const sub of submissions) {
      for (const c of sub.submission_comments ?? []) {
        if (c.author_id === Number(teacherId)) {
          // Redact student PII from comments before style analysis
          teacherComments.push(redact(c.comment, students));
        }
      }
    }

    if (teacherComments.length === 0) {
      return NextResponse.json({
        styleGuide: "",
        message: "No teacher comments found on this assignment.",
      });
    }

    const styleGuide = await extractStyleGuide(teacherComments);
    return NextResponse.json({ styleGuide, commentCount: teacherComments.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
