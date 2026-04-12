// Health check endpoint — usado por Dockerfile HEALTHCHECK y Easypanel
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
