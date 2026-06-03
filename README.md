# Cartera JDN

SaaS profesional para gestión de cartera de seguros. Next.js 15, Supabase, TypeScript.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Estado:** TanStack Query, Zustand
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Gráficos:** Recharts
- **Reportes:** ExcelJS, jsPDF
- **Deploy:** Vercel

## Requisitos

- Node.js 20+
- Proyecto Supabase

## Configuración

1. Clonar e instalar:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
cp .env.example .env.local
```

Completar:

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor / migración |
| `NEXT_PUBLIC_SITE_URL` | URL de la app (ej. `http://localhost:3000`) |

3. Aplicar migraciones en Supabase SQL Editor o CLI:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_views_and_functions.sql`

4. Migrar datos del prototipo HTML:

```bash
npm run migrate:prototype
```

5. Crear usuario admin en Supabase Auth (o usar `/register` en desarrollo).

6. Iniciar desarrollo:

```bash
npm run dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación TypeScript |
| `npm run migrate:prototype` | Importar JSON desde `cartera_jdn-5.html` |

## Arquitectura

```
src/
├── app/              # Rutas App Router
├── components/       # UI y dashboard
├── features/         # Lógica por dominio
├── hooks/
├── lib/              # Supabase, riesgo, utils
├── services/         # Acceso a datos
├── store/            # Zustand
├── types/
└── validations/      # Esquemas Zod
```

## Módulos

- **Dashboard:** KPIs, gráficos por compañía/ramo, producción mensual
- **Clientes:** CRUD, ficha con pólizas, siniestros, tareas, score de riesgo
- **Pólizas:** CRUD, renovación, baja, historial, alertas 30/15/7 días
- **Siniestros:** CRUD y análisis
- **Riesgo:** Motor de score 0–100 (Bajo / Medio / Alto)
- **Tareas:** Seguimiento comercial
- **Reportes:** Export Excel, CSV, PDF

## Deploy en Vercel

1. Conectar repositorio GitHub
2. Configurar variables de entorno (mismas que `.env.local`, sin `SERVICE_ROLE` en runtime cliente)
3. Deploy automático en cada push a `main`

## Seguridad

- RLS: solo usuarios autenticados acceden a datos de negocio
- Modelo single-admin (sin multi-productor)
- Deshabilitar registro público en Supabase en producción

## Licencia

Privado — Cartera JDN
