// Server-side utilities for Next.js API routes
// Only import this from app/api/** routes (Node.js runtime, never Edge)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Verifies session from request. Returns user or sends 401.
 * Usage:
 *   const { user, response } = await requireSession(request);
 *   if (response) return response;
 */
export async function requireSession(
  request: NextRequest
): Promise<{ user: SessionUser; response: null } | { user: null; response: NextResponse }> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return {
        user: null,
        response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
      };
    }
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      response: null,
    };
  } catch {
    return {
      user: null,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
}

/** Convert Date | null to ISO string | null */
export function dateToStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") return d;
  return d.toISOString();
}

/** Convert numeric Drizzle fields (returned as string by pg) to number */
export function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : parseFloat(v);
}

/** Standard JSON error response */
export function apiError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Generate next sequential number for entities that use auto-increment counters.
 * Usage: const nextNum = await nextSeq(db, clients, clients.clientNumber);
 */
import { db as _db } from "@/lib/db";
import { sql as drizzleSql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export async function nextSeq(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  column: PgColumn
): Promise<number> {
  const result = await _db
    .select({ maxVal: drizzleSql<number>`coalesce(max(${column}), 0) + 1` })
    .from(table);
  return result[0]?.maxVal ?? 1;
}
