import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flows } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
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

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const rows = await db
      .select()
      .from(flows)
      .orderBy(desc(flows.createdAt));
    return NextResponse.json(rows.map(mapFlow));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const [row] = await db.insert(flows).values({
      name: body.name as string,
      description: (body.description as string) ?? null,
      n8nWorkflowId: (body.n8n_workflow_id as string) ?? null,
      status: (body.status as "active" | "paused" | "inactive") ?? "inactive",
      triggerType: (body.trigger_type as string) ?? "manual",
      createdBy: user.id as string,
    }).returning();
    return NextResponse.json(mapFlow(row), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
