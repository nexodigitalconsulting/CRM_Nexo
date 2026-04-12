import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificationQueue } from "@/lib/schema";
import { desc, gte, lte, eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapQueue(q: typeof notificationQueue.$inferSelect) {
  return {
    id: q.id,
    rule_type: q.ruleType,
    entity_type: q.entityType,
    entity_id: q.entityId,
    client_id: q.clientId,
    status: q.status,
    sent_at: dateToStr(q.sentAt),
    error_message: q.errorMessage,
    created_at: dateToStr(q.createdAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    if (type === "years") {
      const rows = await db.select({ createdAt: notificationQueue.createdAt })
        .from(notificationQueue)
        .orderBy(desc(notificationQueue.createdAt));
      const years = Array.from(new Set(rows.map((r) => new Date(r.createdAt!).getFullYear())));
      years.sort((a, b) => b - a);
      return NextResponse.json(years);
    }

    if (type === "history") {
      const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
      const page = parseInt(searchParams.get("page") ?? "1");
      const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

      let query = db.select().from(notificationQueue).orderBy(desc(notificationQueue.createdAt));

      if (year) {
        // Drizzle doesn't have typed where chaining for dynamic queries easily, build conditions
        const from = `${year}-01-01`;
        const to = `${year}-12-31T23:59:59`;
        const rows = await db.select().from(notificationQueue)
          .where(gte(notificationQueue.createdAt, new Date(from)))
          .orderBy(desc(notificationQueue.createdAt));
        const filtered = rows.filter((r) => new Date(r.createdAt!).getFullYear() === year);
        const totalCount = filtered.length;
        const data = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
        return NextResponse.json({
          data: data.map(mapQueue),
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        });
      }

      // No year filter
      const all = await query;
      const totalCount = all.length;
      const data = all.slice((page - 1) * pageSize, page * pageSize);
      return NextResponse.json({
        data: data.map(mapQueue),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      });
    }

    // Default: full list
    const rows = await db.select().from(notificationQueue).orderBy(desc(notificationQueue.createdAt));
    return NextResponse.json(rows.map(mapQueue));
  } catch (e) {
    return apiError(String(e));
  }
}
