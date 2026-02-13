import { NextRequest, NextResponse } from "next/server";
import { listSubmissions } from "@/lib/canvas";

export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get("x-canvas-url");
  const token = req.headers.get("x-canvas-token");
  const courseId = req.nextUrl.searchParams.get("courseId");
  const assignmentId = req.nextUrl.searchParams.get("assignmentId");
  const includeComments = req.nextUrl.searchParams.get("includeComments") === "true";

  if (!baseUrl || !token || !courseId || !assignmentId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const submissions = await listSubmissions(
      { baseUrl, token },
      Number(courseId),
      Number(assignmentId),
      includeComments
    );
    return NextResponse.json(submissions);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
