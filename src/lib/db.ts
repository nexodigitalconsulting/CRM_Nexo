// Drizzle ORM client - v2
// IMPORTANTE: Este cliente requiere Node.js (no funciona en el browser).
// En Fase 1 (Next.js), este módulo se usará desde API Routes.
// Durante M1, las queries siguen usando Supabase via src/lib/api/*.ts

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
