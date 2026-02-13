import { NextRequest, NextResponse } from "next/server";
import { listCourses } from "@/lib/canvas";

export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get("x-canvas-url");
  const token = req.headers.get("x-canvas-token");

  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Missing Canvas credentials" }, { status: 400 });
  }

  try {
    const courses = await listCourses({ baseUrl, token });
    return NextResponse.json(courses);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
