import { NextRequest, NextResponse } from "next/server";
import { downloadAttachment } from "@/lib/canvas";

const ALLOWED_EXTENSIONS = [".py"];

export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get("x-canvas-url");
  const token = req.headers.get("x-canvas-token");
  const fileUrl = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") ?? "";

  if (!baseUrl || !token || !fileUrl) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${ext}. Only ${ALLOWED_EXTENSIONS.join(", ")} allowed.` },
      { status: 400 }
    );
  }

  try {
    const text = await downloadAttachment({ baseUrl, token }, fileUrl);
    return NextResponse.json({ text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
