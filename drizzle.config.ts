import { defineConfig } from "drizzle-kit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (globalThis as any).process?.env ?? {};

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: (env.DATABASE_URL as string) || "",
  },
  verbose: true,
  strict: true,
});
