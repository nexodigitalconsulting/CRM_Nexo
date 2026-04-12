import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flows } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, apiError } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFlow(f: any) {
  const execCount = f.executionCount ?? 0;
  const succCount = f.successCount ?? 0;
  return {
    id: f.id,
    org_id: f.orgId,
    name: f.name,
    description: f.description,
    n8n_workflow_id: f.n8nWorkflowId,
    status: f.status ?? "inactive",
    trigger_type: f.triggerType ?? "manual",
    last_run_at: f.lastRunAt ? (f.lastRunAt as Date).toISOString() : null,
    execution_count: execCount,
    success_count: succCount,
    success_rate: execCount > 0 ? Math.round((succCount / execCount) * 1000) / 10 : 0,
    created_by: f.createdBy,
    created_at: f.createdAt ? (f.createdAt as Date).toISOString() : "",
    updated_at: f.updatedAt ? (f.updatedAt as Date).toISOString() : "",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const [row] = await db.select().from(flows).where(eq(flows.id, id));
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapFlow(row));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json() as Record<string, unknown>;
    const update: Partial<typeof flows.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) update.name = body.name as string;
    if (body.description !== undefined) update.description = body.description as string | null;
    if (body.n8n_workflow_id !== undefined) update.n8nWorkflowId = body.n8n_workflow_id as string | null;
    if (body.status !== undefined) update.status = body.status as "active" | "paused" | "inactive";
    if (body.trigger_type !== undefined) update.triggerType = body.trigger_type as string;
    if (body.execution_count !== undefined) update.executionCount = body.execution_count as number;
    if (body.success_count !== undefined) update.successCount = body.success_count as number;
    if (body.last_run_at !== undefined) update.lastRunAt = body.last_run_at ? new Date(body.last_run_at as string) : null;

    const [row] = await db.update(flows).set(update).where(eq(flows.id, id)).returning();
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapFlow(row));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    await db.delete(flows).where(eq(flows.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
