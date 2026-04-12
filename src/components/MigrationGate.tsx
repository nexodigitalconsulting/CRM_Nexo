"use client";

// Fase 1: MigrationGate eliminado.
// El esquema se gestiona con Drizzle ORM (npm run db:migrate).
// Este componente ahora es un pass-through transparente.

import { ReactNode } from "react";

interface MigrationGateProps {
  children: ReactNode;
}

export function MigrationGate({ children }: MigrationGateProps) {
  return <>{children}</>;
}

export default MigrationGate;
