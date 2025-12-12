-- ============================================
-- 01. Extensiones necesarias
-- ============================================
-- Este script se ejecuta automáticamente al iniciar Postgres

-- Extensiones de Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Vector para RAG/AI (embeddings)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Búsqueda de texto completo
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Utilidades
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Crear base de datos para n8n
CREATE DATABASE n8n;

GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Extensiones instaladas correctamente';
END $$;
