import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts, clients, quotes, invoices, expenses, contracts } from "@/lib/schema";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { requireSession, toNum, apiError } from "@/lib/api-server";

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const type = new URL(request.url).searchParams.get("type") ?? "widget";

  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];

    if (type === "widget") {
      const [contactRows, clientRows, quoteRows, invoiceRows, expenseRows, contractRows] = await Promise.all([
        db.select({ id: contacts.id, status: contacts.status, createdAt: contacts.createdAt }).from(contacts),
        db.select({ id: clients.id, status: clients.status }).from(clients),
        db.select({ id: quotes.id, status: quotes.status, total: quotes.total }).from(quotes),
        db.select({ id: invoices.id, status: invoices.status, total: invoices.total, issueDate: invoices.issueDate }).from(invoices),
        db.select({ id: expenses.id, status: expenses.status, total: expenses.total, issueDate: expenses.issueDate }).from(expenses),
        db.select({ id: contracts.id, status: contracts.status, total: contracts.total, billingPeriod: contracts.billingPeriod }).from(contracts),
      ]);

      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyInvoices = invoiceRows.filter((inv) => {
        const d = new Date(inv.issueDate ?? "");
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const monthlyExpenses = expenseRows.filter((exp) => {
        const d = new Date(exp.issueDate ?? "");
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      // MRR: normalize each active contract's total to monthly equivalent
      const activeContracts = contractRows.filter((c) => c.status === "vigente");
      const mrr = activeContracts.reduce((sum, c) => {
        const t = toNum(c.total);
        switch (c.billingPeriod) {
          case "mensual":    return sum + t;
          case "trimestral": return sum + t / 3;
          case "anual":      return sum + t / 12;
          default:           return sum + t;
        }
      }, 0);

      return NextResponse.json({
        contracts: {
          count: contractRows.length,
          active: activeContracts.length,
          mrr: Math.round(mrr * 100) / 100,
        },
        contacts: {
          count: contactRows.length,
          newThisMonth: contactRows.filter((c) => {
            const d = new Date(c.createdAt ?? "");
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          }).length,
        },
        clients: {
          count: clientRows.length,
          active: clientRows.filter((c) => c.status === "activo").length,
        },
        quotes: {
          count: quoteRows.length,
          pending: quoteRows.filter((q) => q.status === "borrador" || q.status === "enviado").length,
          pendingAmount: quoteRows
            .filter((q) => q.status === "borrador" || q.status === "enviado")
            .reduce((sum, q) => sum + toNum(q.total), 0),
        },
        invoices: {
          count: invoiceRows.length,
          monthlyTotal: monthlyInvoices.reduce((sum, inv) => sum + toNum(inv.total), 0),
          pending: invoiceRows.filter((inv) => inv.status === "emitida").length,
        },
        expenses: {
          count: expenseRows.length,
          monthlyTotal: monthlyExpenses.reduce((sum, exp) => sum + toNum(exp.total), 0),
          pending: expenseRows.filter((exp) => exp.status === "pendiente").length,
        },
      });
    }

    // type === "stats"
    const [
      totalContacts,
      newContacts,
      totalClients,
      activeClients,
      totalQuotes,
      pendingQuotes,
      totalInvoices,
      pendingInvoices,
      expenseRows,
      monthlyExpenseRows,
    ] = await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(contacts),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(contacts).where(gte(contacts.createdAt, firstDayOfMonth)),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(clients),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(clients).where(eq(clients.status, "activo")),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(quotes),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(quotes).where(eq(quotes.status, "borrador")),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(invoices),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(invoices).where(inArray(invoices.status, ["borrador", "emitida"])),
      db.select({ total: expenses.total }).from(expenses),
      db.select({ total: expenses.total }).from(expenses).where(gte(expenses.issueDate, firstDayStr)),
    ]);

    return NextResponse.json({
      totalContacts: totalContacts[0]?.count ?? 0,
      newContactsThisMonth: newContacts[0]?.count ?? 0,
      totalClients: totalClients[0]?.count ?? 0,
      activeClients: activeClients[0]?.count ?? 0,
      totalQuotes: totalQuotes[0]?.count ?? 0,
      pendingQuotes: pendingQuotes[0]?.count ?? 0,
      totalInvoices: totalInvoices[0]?.count ?? 0,
      pendingInvoices: pendingInvoices[0]?.count ?? 0,
      totalExpenses: expenseRows.reduce((sum, e) => sum + toNum(e.total), 0),
      expensesThisMonth: monthlyExpenseRows.reduce((sum, e) => sum + toNum(e.total), 0),
    });
  } catch (e) {
    return apiError(String(e));
  }
}
