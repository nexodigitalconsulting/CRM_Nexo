import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { requireSession, dateToStr, apiError, nextSeq } from "@/lib/api-server";

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

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const rows = await db.select().from(contacts).orderBy(desc(contacts.contactNumber));
    return NextResponse.json(rows.map(mapContact));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const contactNumber = await nextSeq(contacts, contacts.contactNumber);
    const [created] = await db.insert(contacts).values({
      contactNumber,
      name: body.name as string,
      email: body.email as string | null,
      phone: body.phone as string | null,
      source: body.source as string | null,
      status: (body.status as "nuevo" | "contactado" | "seguimiento" | "descartado" | "convertido") ?? "nuevo",
      meetingDate: body.meeting_date ? new Date(body.meeting_date as string) : null,
      presentationUrl: body.presentation_url as string | null,
      quoteUrl: body.quote_url as string | null,
      notes: body.notes as string | null,
      createdBy: user.id,
    }).returning();
    return NextResponse.json(mapContact(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
