import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapCampaign(c: typeof campaigns.$inferSelect) {
  return {
    id: c.id,
    campaign_number: c.campaignNumber,
    name: c.name,
    business_name: c.businessName,
    email: c.email,
    phone: c.phone,
    category: c.category,
    address: c.address,
    city: c.city,
    province: c.province,
    postal_code: c.postalCode,
    website: c.website,
    place_id: c.placeId,
    capture_date: c.captureDate,
    sent_at: dateToStr(c.sentAt),
    response_at: dateToStr(c.responseAt),
    response_channel: c.responseChannel,
    response_notes: c.responseNotes,
    last_contact_at: dateToStr(c.lastContactAt),
    status: c.status,
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
    const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapCampaign(row));
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
    const update: Partial<typeof campaigns.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.business_name !== undefined) update.businessName = body.business_name as string | null;
    if (body.email !== undefined) update.email = body.email as string | null;
    if (body.phone !== undefined) update.phone = body.phone as string | null;
    if (body.category !== undefined) update.category = body.category as string | null;
    if (body.address !== undefined) update.address = body.address as string | null;
    if (body.city !== undefined) update.city = body.city as string | null;
    if (body.province !== undefined) update.province = body.province as string | null;
    if (body.postal_code !== undefined) update.postalCode = body.postal_code as string | null;
    if (body.website !== undefined) update.website = body.website as string | null;
    if (body.place_id !== undefined) update.placeId = body.place_id as string | null;
    if (body.capture_date !== undefined) update.captureDate = body.capture_date as string | null;
    if (body.sent_at !== undefined) update.sentAt = body.sent_at ? new Date(body.sent_at as string) : null;
    if (body.response_at !== undefined) update.responseAt = body.response_at ? new Date(body.response_at as string) : null;
    if (body.response_channel !== undefined) update.responseChannel = body.response_channel as string | null;
    if (body.response_notes !== undefined) update.responseNotes = body.response_notes as string | null;
    if (body.last_contact_at !== undefined) update.lastContactAt = body.last_contact_at ? new Date(body.last_contact_at as string) : null;
    if (body.status !== undefined) update.status = body.status as string;
    update.updatedAt = new Date();
    const [updated] = await db.update(campaigns).set(update).where(eq(campaigns.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json(mapCampaign(updated));
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
    await db.delete(campaigns).where(eq(campaigns.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
