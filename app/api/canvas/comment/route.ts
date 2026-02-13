import { NextRequest, NextResponse } from "next/server";
import { postComment } from "@/lib/canvas";

export async function POST(req: NextRequest) {
  const baseUrl = req.headers.get("x-canvas-url");
  const token = req.headers.get("x-canvas-token");

  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Missing Canvas credentials" }, { status: 400 });
  }

  const body = await req.json();
  const { courseId, assignmentId, userId, comment, dryRun } = body;

  if (!courseId || !assignmentId || !userId || !comment) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      wouldPost: { courseId, assignmentId, userId, comment },
    });
  }

  try {
    const result = await postComment(
      { baseUrl, token },
      Number(courseId),
      Number(assignmentId),
      Number(userId),
      comment
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
