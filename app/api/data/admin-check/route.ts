import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { baUser } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { apiError } from "@/lib/api-server";

// Public endpoint — does not require session (called from Setup page)
export async function GET(_request: NextRequest) {
  try {
    const [result] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(baUser);
    return NextResponse.json({ hasAdmin: (result?.count ?? 0) > 0 });
  } catch (e) {
    return apiError(String(e));
  }
}
