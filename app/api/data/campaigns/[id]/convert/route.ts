import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts, campaigns } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, apiError, nextSeq } from "@/lib/api-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json() as { contactData: Record<string, unknown>; userId: string };
    const { contactData } = body;

    const contactNumber = await nextSeq(contacts, contacts.contactNumber);
    const [newContact] = await db.insert(contacts).values({
      contactNumber,
      name: contactData.name as string,
      email: contactData.email as string | null,
      phone: contactData.phone as string | null,
      source: (contactData.source as string) ?? "campaign",
      status: (contactData.status as "nuevo" | "contactado" | "seguimiento" | "descartado" | "convertido") ?? "nuevo",
      meetingDate: contactData.meeting_date ? new Date(contactData.meeting_date as string) : null,
      presentationUrl: contactData.presentation_url as string | null,
      quoteUrl: contactData.quote_url as string | null,
      notes: contactData.notes as string | null,
      createdBy: contactData.created_by as string | null,
    }).returning();

    await db.update(campaigns).set({ status: "cliente", updatedAt: new Date() }).where(eq(campaigns.id, id));

    return NextResponse.json({ contactId: newContact.id }, { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
