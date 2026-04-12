import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapContact(c: typeof contacts.$inferSelect) {
  return {
    id: c.id,
    contact_number: c.contactNumber,
    name: c.name,
    email: c.email,
    phone: c.phone,
    source: c.source,
    status: c.status,
    meeting_date: dateToStr(c.meetingDate),
    presentation_url: c.presentationUrl,
    quote_url: c.quoteUrl,
    notes: c.notes,
    created_by: c.createdBy,
    created_at: dateToStr(c.createdAt) ?? "",
    updated_at: dateToStr(c.updatedAt) ?? "",
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
    const [row] = await db.select().from(contacts).where(eq(contacts.id, id));
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapContact(row));
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
    const update: Partial<typeof contacts.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.email !== undefined) update.email = body.email as string | null;
    if (body.phone !== undefined) update.phone = body.phone as string | null;
    if (body.source !== undefined) update.source = body.source as string | null;
    if (body.status !== undefined) update.status = body.status as "nuevo" | "contactado" | "seguimiento" | "descartado" | "convertido";
    if (body.meeting_date !== undefined) update.meetingDate = body.meeting_date ? new Date(body.meeting_date as string) : null;
    if (body.presentation_url !== undefined) update.presentationUrl = body.presentation_url as string | null;
    if (body.quote_url !== undefined) update.quoteUrl = body.quote_url as string | null;
    if (body.notes !== undefined) update.notes = body.notes as string | null;
    update.updatedAt = new Date();
    const [updated] = await db.update(contacts).set(update).where(eq(contacts.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json(mapContact(updated));
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
    await db.delete(contacts).where(eq(contacts.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
