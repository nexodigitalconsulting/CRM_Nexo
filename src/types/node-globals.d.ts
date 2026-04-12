// Ambient declarations para entornos donde @types/node está incompleto
// (p.ej. instalación en Windows con MAX_PATH). Se eliminará cuando el
// entorno tenga @types/node correctamente instalado.

declare const process: {
  env: Record<string, string | undefined>;
};

declare const Buffer: {
  from(data: ArrayBuffer | Uint8Array | string, encoding?: string): Uint8Array & { length: number };
  isBuffer(obj: unknown): boolean;
};
