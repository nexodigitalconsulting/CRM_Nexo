import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output — requerido para el Dockerfile multi-stage
  output: "standalone",

  // Packages que solo corren en servidor (no bundlear al cliente).
  // better-auth NO está aquí: su módulo /react debe bundlarse con el React de Next.js
  // para evitar el error "useRef of null" por instancias duplicadas de React.
  serverExternalPackages: ["pg", "drizzle-orm"],

  // Alias @ → src/
  // (configurado en tsconfig, Next.js lo lee automáticamente)

  // ESLint desactivado en build — globals package corrupto por MAX_PATH en Windows
  // Reactivar tras reinstalar deps en Linux (Docker/Easypanel)
  eslint: { ignoreDuringBuilds: true },

  // Desactivar type-check en build (ya lo hacemos por separado)
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
