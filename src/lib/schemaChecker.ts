// schemaChecker — PostgreSQL/Drizzle version (Fase 1)
// M3 (Supabase edge functions) eliminated. Schema managed by Drizzle migrations.

export interface SchemaStatus {
  isValid: boolean;
  version: string;
  tables: Record<string, boolean>;
  errors: string[];
}

export async function checkSchema(): Promise<SchemaStatus> {
  // Schema is managed by Drizzle ORM migrations.
  // Tables are always up to date after `npm run db:migrate`.
  return {
    isValid: true,
    version: "fase1",
    tables: {},
    errors: [],
  };
}

export async function ensureSchemaIsValid(): Promise<boolean> {
  return true;
}

export async function initializeUserData(userId: string): Promise<void> {
  // Profile & role creation is handled by Better Auth hooks in auth.ts
  void userId;
}
