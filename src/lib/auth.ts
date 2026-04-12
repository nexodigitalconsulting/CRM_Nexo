// Better Auth — configuración servidor (solo Node.js / Next.js API routes)
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./schema";

export const auth = betterAuth({
  // Base URL — usada para callbacks OAuth y emails
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  // Secret para firmar tokens (mínimo 32 chars)
  secret: process.env.BETTER_AUTH_SECRET!,

  // Adaptador Drizzle apuntando a las tablas ba_*
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.baUser,
      session: schema.baSession,
      account: schema.baAccount,
      verification: schema.baVerification,
      organization: schema.baOrganization,
      member: schema.baMember,
      invitation: schema.baInvitation,
    },
  }),

  // Email + Password habilitado
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // activar en producción con SMTP configurado
    sendResetPassword: async ({ user, url }) => {
      // TODO Fase M3: enviar email de reset via /api/send-email
      console.info(`[Better Auth] Reset password URL para ${user.email}: ${url}`);
    },
  },

  // Plugin de organizaciones (multi-tenant Fase 2)
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],

  // Sesión
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24,     // renovar si quedan < 24h
  },
});

export type Auth = typeof auth;
