
# Plan: Diagnóstico y Solución - Conexión a Base de Datos Diferente en Easypanel

## Problema Identificado

El CRM en Easypanel se está conectando a **dos bases de datos diferentes** porque las variables de entorno no están configuradas correctamente en tiempo de build.

### Causa Raíz

En `src/integrations/supabase/client.ts`:

```javascript
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
```

**Comportamiento actual:**
- Si `VITE_SUPABASE_URL` NO está definido en build time, usa `DEFAULT_SUPABASE_URL` que apunta a `honfwrfkiukckyoelsdm.supabase.co` (Lovable Cloud)
- Resultado: Tanto Lovable preview como Easypanel (sin Build Args) ven la **misma BD de Lovable Cloud**

### Evidencia

La BD de Lovable Cloud tiene **solo 1 usuario**:
- `jose maldonado campano` (consultingnexodigital@gmail.com) - role: admin

Si en Easypanel ves que los usuarios "desaparecen", es porque la app está conectando a la BD de Lovable en lugar de tu BD self-hosted.

---

## Pasos de Verificación (Easypanel)

### 1. Verificar Build Args en Easypanel

```text
CRM → Build → Build Arguments:

VITE_SUPABASE_URL = https://tu-supabase.dominio.com
VITE_SUPABASE_ANON_KEY = eyJhbGc... (tu anon key)
```

**IMPORTANTE:** Después de cambiar Build Args, hacer **Rebuild** (no solo Restart).

### 2. Verificar la conexión actual

Añadir temporalmente en la consola del navegador:

```javascript
// Verificar a qué URL conecta
console.log(window.__SUPABASE_URL || 'No expuesta');
```

---

## Solución: Añadir Debug Visual de Conexión

### Archivos a modificar:

**1. `src/integrations/supabase/client.ts`**

Exportar la URL para debugging:

```typescript
// Añadir al final del archivo
export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  isDefault: SUPABASE_URL === DEFAULT_SUPABASE_URL,
  environment: SUPABASE_URL.includes('supabase.co') ? 'cloud' : 'self-hosted'
});

// Debug: exponer en window para verificación fácil
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_DEBUG = {
    url: SUPABASE_URL,
    isDefault: SUPABASE_URL === DEFAULT_SUPABASE_URL
  };
}
```

**2. `src/components/settings/DatabaseStatus.tsx`**

Añadir panel de información de conexión:

```typescript
// Importar getSupabaseConfig
import { supabase, getSupabaseConfig, SUPABASE_URL } from "@/integrations/supabase/client";

// Añadir en el render, después del estado general:
<div className="grid grid-cols-1 gap-2 p-3 bg-muted/30 rounded-lg">
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">URL de conexión:</span>
    <code className="font-mono text-xs truncate max-w-xs">
      {SUPABASE_URL}
    </code>
  </div>
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Tipo:</span>
    <Badge variant={getSupabaseConfig().isDefault ? "destructive" : "secondary"}>
      {getSupabaseConfig().isDefault ? "⚠️ Default (Lovable Cloud)" : "✓ Self-hosted"}
    </Badge>
  </div>
</div>
```

**3. `src/components/MigrationGate.tsx`**

Añadir advertencia si usa URL por defecto:

```typescript
// En el estado "verified", añadir alerta si usa default:
{getSupabaseConfig().isDefault && schemaStatus?.environment === "self-hosted" && (
  <Alert variant="destructive" className="mt-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      <strong>⚠️ Configuración incorrecta:</strong> La app está usando la BD de Lovable Cloud 
      en lugar de tu BD self-hosted. Configura los Build Args y haz Rebuild.
    </AlertDescription>
  </Alert>
)}
```

---

## Verificación Manual Inmediata

Ejecuta estos pasos ahora en tu instancia de Easypanel:

### 1. En Easypanel → CRM → Build Arguments, verificar:

| Variable | Debe ser |
|----------|----------|
| `VITE_SUPABASE_URL` | `https://TU-SUPABASE-SELFHOSTED.dominio.com` (NO `honfwrfkiukckyoelsdm.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase self-hosted |

### 2. Si los valores son incorrectos o faltan:
- Corregir los valores
- Hacer **Rebuild** (no restart)
- Verificar de nuevo

### 3. Verificar en navegador (después del Rebuild):

Abrir DevTools → Console y ejecutar:

```javascript
// Ver URL actual
fetch('/index.html').then(r => r.text()).then(html => {
  const match = html.match(/supabase\.co|easypanel|tu-dominio/);
  console.log('URL detectada:', match);
});
```

---

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `src/integrations/supabase/client.ts` | Exponer config para debug + window.__SUPABASE_DEBUG |
| `src/components/settings/DatabaseStatus.tsx` | Panel visual mostrando URL de conexión |
| `src/components/MigrationGate.tsx` | Alerta si usa URL default en self-hosted |

---

## Información Técnica

### Por qué ocurre esto

1. Vite inyecta `import.meta.env.VITE_*` en **build time**, no runtime
2. Si los Build Args no están en Easypanel, el build usa los defaults del código
3. Los defaults apuntan a Lovable Cloud (`honfwrfkiukckyoelsdm.supabase.co`)
4. El `.env` del repositorio también tiene valores de Lovable Cloud (solo para desarrollo)

### Flujo correcto

```text
Easypanel Build Args → Docker Build Args → ENV vars en build → Vite inyecta → Bundle final
```

Si cualquier paso falla, se usa el default de Lovable Cloud.
