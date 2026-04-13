/**
 * POST /api/data/flows/[id]/trigger
 *
 * Triggers an n8n workflow execution. Two modes:
 *  - Webhook mode: n8nWorkflowId is a full URL → POST directly to it
 *  - API mode: n8nWorkflowId is a workflow ID + N8N_BASE_URL env set → use REST API
 *
 * On success: increments executionCount + successCount, updates lastRunAt
 * On failure: increments executionCount only
 *
 * Optional body: { payload: object } — forwarded to n8n as request body
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flows } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requireSession, apiError } from "@/lib/api-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;

  const { id } = await params;

  const [flow] = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
  if (!flow) return apiError("Flujo no encontrado", 404);

  if (flow.status === "inactive") {
    return NextResponse.json({ error: "El flujo está inactivo" }, { status: 400 });
  }

  // Parse optional body payload
  let payload: Record<string, unknown> = {};
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body?.payload && typeof body.payload === "object") {
      payload = body.payload as Record<string, unknown>;
    }
  } catch {
    // no body — ok
  }

  // Determine target URL
  const n8nId = flow.n8nWorkflowId?.trim();
  const n8nBase = process.env.N8N_BASE_URL?.replace(/\/$/, "");
  const n8nKey = process.env.N8N_API_KEY;

  let targetUrl: string | null = null;
  let useApiMode = false;

  if (n8nId?.startsWith("http")) {
    // Webhook mode
    targetUrl = n8nId;
  } else if (n8nId && n8nBase) {
    // REST API mode: POST /api/v1/workflows/{id}/run
    targetUrl = `${n8nBase}/api/v1/workflows/${n8nId}/run`;
    useApiMode = true;
  }

  if (!targetUrl) {
    return NextResponse.json(
      { error: "No hay Webhook URL ni N8N_BASE_URL configurado para este flujo" },
      { status: 400 }
    );
  }

  // Build headers
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useApiMode && n8nKey) headers["X-N8N-API-KEY"] = n8nKey;

  // Call n8n
  let ok = false;
  let executionId: string | null = null;
  let n8nError: string | null = null;

  try {
    const n8nRes = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (n8nRes.ok) {
      ok = true;
      try {
        const data = await n8nRes.json() as Record<string, unknown>;
        // API mode returns { data: { id: executionId } }
        const inner = data?.data as Record<string, unknown> | undefined;
        executionId = String(inner?.id ?? data?.executionId ?? "");
      } catch { /* webhook may return non-JSON */ }
    } else {
      const errText = await n8nRes.text();
      n8nError = `n8n ${n8nRes.status}: ${errText.slice(0, 200)}`;
    }
  } catch (e) {
    n8nError = String(e);
  }

  // Update flow stats in DB
  await db
    .update(flows)
    .set({
      lastRunAt: new Date(),
      executionCount: sql`${flows.executionCount} + 1`,
      successCount: ok ? sql`${flows.successCount} + 1` : flows.successCount,
      updatedAt: new Date(),
    })
    .where(eq(flows.id, id));

  if (ok) {
    return NextResponse.json({ ok: true, executionId });
  } else {
    return NextResponse.json({ ok: false, error: n8nError }, { status: 502 });
  }
}
