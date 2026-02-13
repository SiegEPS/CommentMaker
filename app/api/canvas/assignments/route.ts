import { NextRequest, NextResponse } from "next/server";
import { listAssignments } from "@/lib/canvas";

export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get("x-canvas-url");
  const token = req.headers.get("x-canvas-token");
  const courseId = req.nextUrl.searchParams.get("courseId");

  if (!baseUrl || !token || !courseId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const assignments = await listAssignments({ baseUrl, token }, Number(courseId));
    return NextResponse.json(assignments);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
