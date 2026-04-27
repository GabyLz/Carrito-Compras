# Commerce Suite - Guia de instalacion

Este proyecto es un monorepo con:
- Backend: Node.js + Express + Prisma + PostgreSQL
- Frontend: React + Vite + TypeScript

## 1. Requisitos previos

Instala lo siguiente en la nueva computadora:
- Node.js 20.x o superior
- npm 10.x o superior
- PostgreSQL 14+ (recomendado)
- Git

Verifica versiones:

```bash
node -v
npm -v
psql --version
```

## 2. Clonar e instalar dependencias

```bash
git clone <URL_DEL_REPOSITORIO>
cd carrito-compras
npm install
```

Este `npm install` instala dependencias de `backend` y `frontend` (workspaces).

## 3. Configurar base de datos PostgreSQL

Crea una base de datos (ejemplo):

```sql
CREATE DATABASE ecommerce_db;
```

Tambien puedes revisar el script SQL disponible en `sql/create_database.sql`.

## 4. Variables de entorno del backend

Crea el archivo `backend/.env` con este contenido minimo:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/ecommerce_db?schema=public"

JWT_SECRET="cambia_este_secreto"
JWT_REFRESH_SECRET="cambia_este_refresh_secreto"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL="http://localhost:5173"

# Opcionales
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Notas:
- `DATABASE_URL`, `JWT_SECRET` y `JWT_REFRESH_SECRET` son obligatorios.
- En desarrollo, el frontend corre por defecto en `http://localhost:5173`.

## 5. Preparar Prisma (migraciones + seed)

Desde la raiz del proyecto:

```bash
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend
```

El seed crea roles, estados base y usuarios demo.

## 6. Levantar el proyecto

### Opcion recomendada (todo junto)

```bash
npm run dev
```

Esto inicia backend y frontend en paralelo.

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api/v1`

### Opcion por separado

Terminal 1:

```bash
npm run dev --workspace=backend
```

Terminal 2:

```bash
npm run dev --workspace=frontend
```

## 7. Usuarios de prueba (seed)

Password para todos:

```text
Demo123456!
```

Usuarios:
- `admin.demo@tienda.local`
- `ventas.demo@tienda.local`
- `inventario.demo@tienda.local`
- `vendedor.demo@tienda.local`
- `cliente.demo@tienda.local`

## 8. Build para produccion

```bash
npm run build
npm run start
```

## 9. Problemas comunes

### Error de conexion a PostgreSQL
- Revisa `DATABASE_URL` en `backend/.env`.
- Verifica que PostgreSQL este iniciado y escuchando en el puerto correcto.

### Puerto ocupado
- Cambia `PORT` en `backend/.env`.
- Si cambias backend port, ajusta proxy de Vite en `frontend/vite.config.ts`.

### Fallo con Puppeteer en reportes PDF
- En algunos sistemas hace falta instalar dependencias del navegador de Chromium.
- Si es necesario, configura `PUPPETEER_EXECUTABLE_PATH` apuntando a un Chrome/Chromium instalado.

## 10. Scripts utiles

Raiz:
- `npm run dev` -> backend + frontend
- `npm run build` -> build de workspaces
- `npm run start` -> inicia backend compilado

Backend:
- `npm run dev --workspace=backend`
- `npm run prisma:migrate --workspace=backend`
- `npm run prisma:seed --workspace=backend`

Frontend:
- `npm run dev --workspace=frontend`
- `npm run build --workspace=frontend`
- `npm run lint --workspace=frontend`
