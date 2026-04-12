// API layer: auth — Better Auth client wrapper (Fase 1)
"use client";
import { authClient } from "@/lib/auth-client";

// Tipos propios — reemplazan los de @supabase/supabase-js
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  user: User;
}

export type AppRole = "admin" | "manager" | "user" | "readonly";

export async function authSignIn(
  email: string,
  password: string
): Promise<{ error: Error | null }> {
  const { error } = await authClient.signIn.email({ email, password });
  return { error: error ? new Error(error.message) : null };
}

export async function authSignUp(
  email: string,
  password: string,
  fullName?: string
): Promise<{ error: Error | null }> {
  const { error } = await authClient.signUp.email({
    email,
    password,
    name: fullName ?? email,
  });
  return { error: error ? new Error(error.message) : null };
}

export async function authSignOut(): Promise<void> {
  await authClient.signOut();
}

export async function authResetPassword(
  email: string
): Promise<{ error: Error | null }> {
  const { error } = await authClient.requestPasswordReset({ email });
  return { error: error ? new Error(error.message) : null };
}

// Better Auth uses useSession hook — these stubs keep hook compatibility
export async function authGetSession() {
  // Session is managed reactively via useSession()
  // This sync helper returns empty to satisfy legacy call sites
  return { data: { session: null }, error: null };
}

// No-op: Better Auth manages session state reactively
export function authOnStateChange(
  _callback: (event: string, session: Session | null) => void
): { data: { subscription: { unsubscribe: () => void } } } {
  return { data: { subscription: { unsubscribe: () => {} } } };
}

// Roles: en Fase 1 devuelve array vacío — implementar con user_roles en Drizzle (Fase 2)
export async function fetchUserRoles(_userId: string): Promise<AppRole[]> {
  return [];
}
