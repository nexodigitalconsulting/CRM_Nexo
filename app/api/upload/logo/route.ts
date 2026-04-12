// API route: upload company logo to Cloudflare R2
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Require authenticated session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const key = `company-assets/logo-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const url = await uploadFile(key, uint8, file.type || "application/octet-stream");

  return NextResponse.json({ url });
}
