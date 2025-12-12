# ⚡ Despliegue Rápido (5 minutos)

## TL;DR - Comandos Mínimos

```bash
# 1. Preparar
cd easypanel
chmod +x scripts/*.sh
./scripts/deploy.sh mi_crm

# 2. Editar .env (cambiar dominios y SMTP)
nano mi_crm/.env

# 3. Subir a Easypanel
# → Nuevo proyecto → Docker Compose → Pegar docker-compose.yml → Variables de .env → Deploy

# 4. Crear admin
# → Studio → SQL Editor → Ejecutar SQL de abajo
```

## SQL para Crear Admin

```sql
-- Después de registrar un usuario, ejecuta esto:
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'TU_EMAIL_AQUI';
```

## Checklist Rápido

| Paso | Descripción | ✓ |
|------|-------------|---|
| 1 | Ejecutar `deploy.sh` | ☐ |
| 2 | Editar `.env` con dominios | ☐ |
| 3 | Crear proyecto en Easypanel | ☐ |
| 4 | Pegar docker-compose.yml | ☐ |
| 5 | Añadir variables de entorno | ☐ |
| 6 | Configurar dominios | ☐ |
| 7 | Hacer Deploy | ☐ |
| 8 | Crear usuario admin | ☐ |
| 9 | Configurar SMTP en /settings | ☐ |

## Dominios a Configurar

```
crm.tudominio.com      → servicio: crm-web (puerto 80)
api.tudominio.com      → servicio: kong (puerto 8000)
studio.tudominio.com   → servicio: studio (puerto 3000)
n8n.tudominio.com      → servicio: n8n (puerto 5678)
```

## ¿Problemas?

Lee la guía completa: [DEPLOY.md](./DEPLOY.md)
