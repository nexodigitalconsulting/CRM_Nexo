#!/usr/bin/env node
/**
 * CRM Nexo — Setup interactivo de variables de entorno
 * Uso: node scripts/setup-env.mjs
 *
 * Genera automáticamente:
 *   - BETTER_AUTH_SECRET (crypto.randomBytes)
 *
 * Solicita interactivamente el resto.
 */

import { randomBytes } from "crypto";
import { createInterface } from "readline";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const ENV_PATH = resolve(ROOT, ".env");
const EXAMPLE_PATH = resolve(ROOT, ".env.example");

// ── Colores ──────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

const log = {
  title: (t) => console.log(`\n${c.bold}${c.cyan}${t}${c.reset}`),
  ok: (t) => console.log(`  ${c.green}✓${c.reset} ${t}`),
  info: (t) => console.log(`  ${c.cyan}ℹ${c.reset} ${t}`),
  warn: (t) => console.log(`  ${c.yellow}⚠${c.reset}  ${t}`),
  dim: (t) => console.log(`  ${c.dim}${t}${c.reset}`),
  skip: (t) => console.log(`  ${c.dim}↷ Saltado: ${t}${c.reset}`),
};

// ── Readline helper ───────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def = "") =>
  new Promise((res) => {
    const hint = def ? ` ${c.dim}[${def}]${c.reset}` : "";
    rl.question(`  ${c.bold}?${c.reset} ${q}${hint}: `, (ans) =>
      res(ans.trim() || def)
    );
  });
const confirm = (q) =>
  new Promise((res) => {
    rl.question(`  ${c.bold}?${c.reset} ${q} ${c.dim}(s/N)${c.reset}: `, (a) =>
      res(a.trim().toLowerCase() === "s")
    );
  });

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log(
    `\n${c.bold}${c.cyan}╔═══════════════════════════════════════╗
║   CRM Nexo v2.0 — Setup de entorno    ║
╚═══════════════════════════════════════╝${c.reset}`
  );

  // Cargar .env existente si existe
  let existing = {};
  if (existsSync(ENV_PATH)) {
    log.warn(".env ya existe. Los valores actuales se mostrarán como default.");
    existing = parseEnv(readFileSync(ENV_PATH, "utf8"));
  }

  const env = {};

  // ── 1. Base de datos ─────────────────────────────────
  log.title("1 / 5 · Base de datos (PostgreSQL)");
  log.info("Formato: postgresql://usuario:contraseña@host:puerto/nombre_bd");
  log.dim("  EasyPanel: copia la 'Internal Connection String' del servicio PostgreSQL");
  log.dim("  Local: postgresql://crm:crm@localhost:5432/Crm_Nexo");

  env.DATABASE_URL = await ask(
    "DATABASE_URL",
    existing.DATABASE_URL || "postgresql://crm:crm@localhost:5432/Crm_Nexo"
  );

  // ── 2. Better Auth ────────────────────────────────────
  log.title("2 / 5 · Autenticación (Better Auth)");

  // Secret: auto-generar si no existe
  const existingSecret = existing.BETTER_AUTH_SECRET;
  const hasValidSecret = existingSecret && existingSecret.length >= 32;

  if (hasValidSecret) {
    log.ok(`BETTER_AUTH_SECRET ya existe (${existingSecret.length} chars) — se conserva`);
    env.BETTER_AUTH_SECRET = existingSecret;
  } else {
    const generated = randomBytes(32).toString("hex"); // 64 chars hex
    log.ok(`BETTER_AUTH_SECRET generado automáticamente: ${c.dim}${generated}${c.reset}`);
    env.BETTER_AUTH_SECRET = generated;
  }

  log.info("BETTER_AUTH_URL = URL pública donde estará desplegada la app");
  log.dim("  Ejemplo: https://crm.tudominio.com");
  log.dim("  Debe coincidir con el dominio configurado en EasyPanel");

  env.BETTER_AUTH_URL = await ask(
    "BETTER_AUTH_URL",
    existing.BETTER_AUTH_URL || "https://crm.tudominio.com"
  );
  env.NEXT_PUBLIC_APP_URL = env.BETTER_AUTH_URL;
  log.ok(`NEXT_PUBLIC_APP_URL = ${env.NEXT_PUBLIC_APP_URL} (mismo que BETTER_AUTH_URL)`);

  // ── 3. Cloudflare R2 ─────────────────────────────────
  log.title("3 / 5 · Almacenamiento Cloudflare R2 (opcional)");
  log.info("Necesario para subir PDFs, documentos y adjuntos.");
  log.dim("  Cómo obtenerlo:");
  log.dim("  1. cloudflare.com → My Profile → API Tokens → Create Token");
  log.dim("  2. Usar template 'Edit Cloudflare Workers'");
  log.dim("  3. En R2 → Manage R2 API Tokens → Create API Token");
  log.dim("  Account ID: cloudflare.com → lado derecho de la página principal");

  const useR2 = await confirm("¿Configurar Cloudflare R2?");
  if (useR2) {
    env.R2_ACCOUNT_ID = await ask("R2_ACCOUNT_ID", existing.R2_ACCOUNT_ID || "");
    env.R2_ACCESS_KEY_ID = await ask("R2_ACCESS_KEY_ID", existing.R2_ACCESS_KEY_ID || "");
    env.R2_SECRET_ACCESS_KEY = await ask("R2_SECRET_ACCESS_KEY", existing.R2_SECRET_ACCESS_KEY || "");
    env.R2_BUCKET_NAME = await ask("R2_BUCKET_NAME", existing.R2_BUCKET_NAME || "crm-nexo-assets");
    log.dim("  R2_PUBLIC_URL: En R2 → bucket → Settings → Public Access → Enable → copia la URL");
    env.R2_PUBLIC_URL = await ask("R2_PUBLIC_URL", existing.R2_PUBLIC_URL || "https://pub-xxxx.r2.dev");
  } else {
    log.skip("R2 — los archivos se desactivarán hasta configurarlo");
    env.R2_ACCOUNT_ID = existing.R2_ACCOUNT_ID || "";
    env.R2_ACCESS_KEY_ID = existing.R2_ACCESS_KEY_ID || "";
    env.R2_SECRET_ACCESS_KEY = existing.R2_SECRET_ACCESS_KEY || "";
    env.R2_BUCKET_NAME = existing.R2_BUCKET_NAME || "crm-nexo-assets";
    env.R2_PUBLIC_URL = existing.R2_PUBLIC_URL || "";
  }

  // ── 4. SMTP Email ─────────────────────────────────────
  log.title("4 / 5 · Email SMTP (opcional)");
  log.info("Necesario para enviar facturas, presupuestos y notificaciones.");
  log.dim("  Proveedores recomendados:");
  log.dim("  · Resend    → resend.com — SMTP gratis 100 emails/día");
  log.dim("    Host: smtp.resend.com  Puerto: 465  User: resend  Pass: API key");
  log.dim("  · Brevo     → brevo.com — 300 emails/día gratis");
  log.dim("    Host: smtp-relay.brevo.com  Puerto: 587");
  log.dim("  · Gmail     → Configuración → Seguridad → Contraseña de aplicación");
  log.dim("    Host: smtp.gmail.com  Puerto: 587");

  const useSmtp = await confirm("¿Configurar SMTP?");
  if (useSmtp) {
    env.SMTP_HOST = await ask("SMTP_HOST", existing.SMTP_HOST || "smtp.resend.com");
    env.SMTP_PORT = await ask("SMTP_PORT", existing.SMTP_PORT || "465");
    env.SMTP_USER = await ask("SMTP_USER", existing.SMTP_USER || "resend");
    env.SMTP_PASS = await ask("SMTP_PASS (API key o contraseña)", existing.SMTP_PASS || "");
    env.SMTP_FROM = await ask("SMTP_FROM (email remitente)", existing.SMTP_FROM || `noreply@${new URL(env.BETTER_AUTH_URL).hostname}`);
  } else {
    log.skip("SMTP — el envío de emails estará desactivado");
    env.SMTP_HOST = existing.SMTP_HOST || "";
    env.SMTP_PORT = existing.SMTP_PORT || "587";
    env.SMTP_USER = existing.SMTP_USER || "";
    env.SMTP_PASS = existing.SMTP_PASS || "";
    env.SMTP_FROM = existing.SMTP_FROM || "";
  }

  // ── 5. Resumen y escritura ────────────────────────────
  log.title("5 / 5 · Resumen");

  const lines = [
    "# CRM Nexo v2.0 — Variables de entorno",
    `# Generado: ${new Date().toISOString()}`,
    "# NO subir este archivo a Git",
    "",
    "# ── Base de datos ──────────────────────────────────",
    `DATABASE_URL="${env.DATABASE_URL}"`,
    "",
    "# ── Better Auth ────────────────────────────────────",
    `BETTER_AUTH_SECRET="${env.BETTER_AUTH_SECRET}"`,
    `BETTER_AUTH_URL="${env.BETTER_AUTH_URL}"`,
    `NEXT_PUBLIC_APP_URL="${env.NEXT_PUBLIC_APP_URL}"`,
    "",
    "# ── Cloudflare R2 ───────────────────────────────────",
    `R2_ACCOUNT_ID="${env.R2_ACCOUNT_ID}"`,
    `R2_ACCESS_KEY_ID="${env.R2_ACCESS_KEY_ID}"`,
    `R2_SECRET_ACCESS_KEY="${env.R2_SECRET_ACCESS_KEY}"`,
    `R2_BUCKET_NAME="${env.R2_BUCKET_NAME}"`,
    `R2_PUBLIC_URL="${env.R2_PUBLIC_URL}"`,
    "",
    "# ── SMTP Email ──────────────────────────────────────",
    `SMTP_HOST="${env.SMTP_HOST}"`,
    `SMTP_PORT="${env.SMTP_PORT}"`,
    `SMTP_USER="${env.SMTP_USER}"`,
    `SMTP_PASS="${env.SMTP_PASS}"`,
    `SMTP_FROM="${env.SMTP_FROM}"`,
  ];

  console.log("");
  lines.forEach((l) => log.dim(l));

  const ok = await confirm("\n¿Guardar .env con estos valores?");
  if (ok) {
    writeFileSync(ENV_PATH, lines.join("\n") + "\n", "utf8");
    log.ok(`.env guardado en ${ENV_PATH}`);
    log.info("Siguiente paso: npm run db:migrate");
  } else {
    log.warn("Cancelado — .env no modificado");
  }

  rl.close();
}

function parseEnv(content) {
  const result = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
