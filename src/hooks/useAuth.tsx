"use client";

// useAuth — Better Auth (Fase 1)
import { createContext, useContext, ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import {
  authSignIn,
  authSignUp,
  authSignOut,
  authResetPassword,
  type User,
  type Session,
  type AppRole,
} from "@/lib/api/auth";

// Tipo interno para el dato de sesión de Better Auth
interface BetterAuthSessionData {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isManager: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: rawSession, isPending } = useSession();
  const sessionData = rawSession as BetterAuthSessionData | null | undefined;

  // Map Better Auth session to our internal types
  const user: User | null = sessionData?.user
    ? {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
        image: sessionData.user.image ?? undefined,
        emailVerified: sessionData.user.emailVerified,
        createdAt: sessionData.user.createdAt,
        updatedAt: sessionData.user.updatedAt,
      }
    : null;

  const session: Session | null = sessionData
    ? {
        id: sessionData.session.id,
        userId: sessionData.session.userId,
        token: sessionData.session.token,
        expiresAt: sessionData.session.expiresAt,
        user: user!,
      }
    : null;

  // Roles: placeholder for Fase 2 (user_roles table via Drizzle)
  const roles: AppRole[] = [];
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager") || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: isPending,
        roles,
        isAdmin,
        isManager,
        signIn: authSignIn,
        signUp: authSignUp,
        signOut: authSignOut,
        resetPassword: authResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
