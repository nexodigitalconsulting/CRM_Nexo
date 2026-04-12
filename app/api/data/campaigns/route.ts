import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { requireSession, dateToStr, apiError, nextSeq } from "@/lib/api-server";

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
    status: c.status,
    created_by: c.createdBy,
    created_at: dateToStr(c.createdAt) ?? "",
    updated_at: dateToStr(c.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const rows = await db.select().from(campaigns).orderBy(desc(campaigns.campaignNumber));
    return NextResponse.json(rows.map(mapCampaign));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const campaignNumber = await nextSeq(campaigns, campaigns.campaignNumber);
    const [created] = await db.insert(campaigns).values({
      campaignNumber,
      name: body.name as string,
      businessName: body.business_name as string | null,
      email: body.email as string | null,
      phone: body.phone as string | null,
      category: body.category as string | null,
      address: body.address as string | null,
      city: body.city as string | null,
      province: body.province as string | null,
      postalCode: body.postal_code as string | null,
      website: body.website as string | null,
      placeId: body.place_id as string | null,
      captureDate: body.capture_date as string | null,
      status: (body.status as string) ?? "active",
      createdBy: user.id,
    }).returning();
    return NextResponse.json(mapCampaign(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
