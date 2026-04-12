"use client";

// La protección de rutas se gestiona en app/(app)/layout.tsx.
// Este componente se mantiene como stub para compatibilidad con imports existentes.

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "manager" | "user";
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
