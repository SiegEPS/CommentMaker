import { NextRequest, NextResponse } from "next/server";
import { getSelf } from "@/lib/canvas";

export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get("x-canvas-url");
  const token = req.headers.get("x-canvas-token");

  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Missing Canvas credentials" }, { status: 400 });
  }

  try {
    const user = await getSelf({ baseUrl, token });
    return NextResponse.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
