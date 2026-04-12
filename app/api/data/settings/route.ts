import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companySettings, pdfSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapCompanySettings(s: typeof companySettings.$inferSelect) {
  return {
    id: s.id,
    org_id: s.orgId,
    name: s.name,
    cif: s.cif,
    address: s.address,
    city: s.city,
    province: s.province,
    postal_code: s.postalCode,
    country: s.country,
    phone: s.phone,
    email: s.email,
    website: s.website,
    logo_url: s.logoUrl,
    iban: s.iban,
    bic: s.bic,
    sepa_creditor_id: s.sepaCreditorId,
    currency: s.currency,
    language: s.language,
    timezone: s.timezone,
    date_format: s.dateFormat,
    created_at: dateToStr(s.createdAt) ?? "",
    updated_at: dateToStr(s.updatedAt) ?? "",
  };
}

function mapPdfSettings(s: typeof pdfSettings.$inferSelect) {
  return {
    id: s.id,
    org_id: s.orgId,
    primary_color: s.primaryColor,
    secondary_color: s.secondaryColor,
    accent_color: s.accentColor,
    show_logo: s.showLogo,
    logo_position: s.logoPosition,
    show_iban_footer: s.showIbanFooter,
    show_notes: s.showNotes,
    show_discounts_column: s.showDiscountsColumn,
    header_style: s.headerStyle,
    font_size_base: s.fontSizeBase,
    created_at: dateToStr(s.createdAt) ?? "",
    updated_at: dateToStr(s.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  try {
    if (type === "pdf") {
      const rows = await db.select().from(pdfSettings).limit(1);
      return NextResponse.json(rows[0] ? mapPdfSettings(rows[0]) : null);
    }
    const rows = await db.select().from(companySettings).limit(1);
    return NextResponse.json(rows[0] ? mapCompanySettings(rows[0]) : null);
  } catch (e) {
    return apiError(String(e));
  }
}

export async function PUT(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  try {
    const body = await request.json() as Record<string, unknown>;

    if (type === "pdf") {
      const existing = await db.select().from(pdfSettings).limit(1);
      let row;
      if (existing[0]) {
        const update: Partial<typeof pdfSettings.$inferInsert> = {};
        if (body.primary_color !== undefined) update.primaryColor = body.primary_color as string;
        if (body.secondary_color !== undefined) update.secondaryColor = body.secondary_color as string;
        if (body.accent_color !== undefined) update.accentColor = body.accent_color as string;
        if (body.show_logo !== undefined) update.showLogo = body.show_logo as boolean;
        if (body.logo_position !== undefined) update.logoPosition = body.logo_position as string;
        if (body.show_iban_footer !== undefined) update.showIbanFooter = body.show_iban_footer as boolean;
        if (body.show_notes !== undefined) update.showNotes = body.show_notes as boolean;
        if (body.show_discounts_column !== undefined) update.showDiscountsColumn = body.show_discounts_column as boolean;
        if (body.header_style !== undefined) update.headerStyle = body.header_style as string;
        if (body.font_size_base !== undefined) update.fontSizeBase = body.font_size_base as number;
        update.updatedAt = new Date();
        [row] = await db.update(pdfSettings).set(update).where(eq(pdfSettings.id, existing[0].id)).returning();
      } else {
        [row] = await db.insert(pdfSettings).values({
          primaryColor: body.primary_color as string | undefined,
          secondaryColor: body.secondary_color as string | undefined,
          accentColor: body.accent_color as string | undefined,
          showLogo: body.show_logo as boolean | undefined,
          logoPosition: body.logo_position as string | undefined,
          showIbanFooter: body.show_iban_footer as boolean | undefined,
          showNotes: body.show_notes as boolean | undefined,
          showDiscountsColumn: body.show_discounts_column as boolean | undefined,
          headerStyle: body.header_style as string | undefined,
          fontSizeBase: body.font_size_base as number | undefined,
        }).returning();
      }
      return NextResponse.json(mapPdfSettings(row));
    }

    // Company settings
    const existing = await db.select().from(companySettings).limit(1);
    let row;
    if (existing[0]) {
      const update: Partial<typeof companySettings.$inferInsert> = {};
      if (body.name !== undefined) update.name = body.name as string;
      if (body.cif !== undefined) update.cif = body.cif as string | null;
      if (body.address !== undefined) update.address = body.address as string | null;
      if (body.city !== undefined) update.city = body.city as string | null;
      if (body.province !== undefined) update.province = body.province as string | null;
      if (body.postal_code !== undefined) update.postalCode = body.postal_code as string | null;
      if (body.country !== undefined) update.country = body.country as string | null;
      if (body.phone !== undefined) update.phone = body.phone as string | null;
      if (body.email !== undefined) update.email = body.email as string | null;
      if (body.website !== undefined) update.website = body.website as string | null;
      if (body.logo_url !== undefined) update.logoUrl = body.logo_url as string | null;
      if (body.iban !== undefined) update.iban = body.iban as string | null;
      if (body.bic !== undefined) update.bic = body.bic as string | null;
      if (body.sepa_creditor_id !== undefined) update.sepaCreditorId = body.sepa_creditor_id as string | null;
      if (body.currency !== undefined) update.currency = body.currency as string;
      if (body.language !== undefined) update.language = body.language as string;
      if (body.timezone !== undefined) update.timezone = body.timezone as string;
      if (body.date_format !== undefined) update.dateFormat = body.date_format as string;
      update.updatedAt = new Date();
      [row] = await db.update(companySettings).set(update).where(eq(companySettings.id, existing[0].id)).returning();
    } else {
      [row] = await db.insert(companySettings).values({
        name: body.name as string,
        cif: body.cif as string | null,
        address: body.address as string | null,
        city: body.city as string | null,
        province: body.province as string | null,
        postalCode: body.postal_code as string | null,
        country: body.country as string | null,
        phone: body.phone as string | null,
        email: body.email as string | null,
        website: body.website as string | null,
        logoUrl: body.logo_url as string | null,
        iban: body.iban as string | null,
        bic: body.bic as string | null,
        sepaCreditorId: body.sepa_creditor_id as string | null,
        currency: body.currency as string | undefined,
        language: body.language as string | undefined,
        timezone: body.timezone as string | undefined,
        dateFormat: body.date_format as string | undefined,
      }).returning();
    }
    return NextResponse.json(mapCompanySettings(row));
  } catch (e) {
    return apiError(String(e));
  }
}
