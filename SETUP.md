# Marketplace API — Setup & Deployment Guide

## Stack
- **Next.js 14** (App Router, API routes only)
- **Prisma ORM** with PostgreSQL
- **Supabase** as database host
- **Supabase Auth** for authentication
- **Zod** for input validation

---

## 1. Environment Setup

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
# From Supabase → Project Settings → Database → Connection pooling (Transaction mode)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# From Supabase → Project Settings → Database → Direct connection
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="[project-anon-key]"

# Required: lets prisma/seed.ts create the demo users in Supabase Auth (auth.users)
SUPABASE_SERVICE_ROLE_KEY="[project-service-role-key]"
NODE_ENV="development"
```

> ⚠️ Use `DATABASE_URL` with `?pgbouncer=true` for app queries (Prisma needs this with Supabase pooler).  
> Use `DIRECT_URL` for migrations only.

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Generate Prisma Client

```bash
npm run db:generate
```

---

## 4. Run Migrations

**Development (creates migration files):**
```bash
npm run db:migrate:dev -- --name init
```

**Production (applies existing migrations):**
```bash
npm run db:migrate
```

---

## 5. Seed Database

```bash
npm run db:seed
```

This creates:
- 5 templates (fashion, electronics, food, church, team)
- 5 store categories + 6 product categories
- 1 admin profile + 1 merchant profile
- 2 sample stores + 3 sample products

The seed script creates or links these users in Supabase Auth (`auth.users`) and then mirrors their IDs into the app `users` profile table:
| Role     | Email                      | Password      |
|----------|---------------------------|---------------|
| Admin    | admin@marketplace.com     | Admin@1234    |
| Merchant | merchant@example.com      | Merchant@1234 |

---

## 6. Start Development Server

```bash
npm run dev
```

API available at: `http://localhost:3000`

---

## API Reference

### Health Check
```
GET /api/health
```

### Auth
```
POST /api/auth/register      — Register new user
POST /api/auth/login         — Login, returns Supabase session
POST /api/auth/google        — Continue with Google, returns Supabase session
GET  /api/me                 — Get current user (requires auth)
```

Google auth accepts a Google ID token from the client:
```json
{
  "idToken": "<google-id-token>"
}
```

`idToken` is not the user's email address. It is the JWT returned by Google's sign-in SDK after the user completes Google authentication.

### Stores
```
GET    /api/stores                    — List all stores (paginated)
POST   /api/stores                    — Create store (auth required)
GET    /api/stores/check-slug?slug=x  — Check store slug availability
GET    /api/stores/:slug              — Get store by slug (public)
PATCH  /api/stores/:slug              — Update store (owner only)
DELETE /api/stores/:slug              — Delete store (owner only)
PUT    /api/stores/:slug/template     — Assign template to store (owner only)
```

### Products
```
GET    /api/stores/:slug/products     — List store products (public, paginated)
POST   /api/stores/:slug/products     — Add product to store (owner only)
GET    /api/products/:id              — Get product detail (public)
PATCH  /api/products/:id              — Update product (owner only)
DELETE /api/products/:id              — Delete product (owner only)
```

Authenticated user's product management:
```
GET    /api/me/products        — List products owned by authenticated user
POST   /api/me/products        — Create product for one of authenticated user's stores
GET    /api/me/products/:id    — Get authenticated user's product detail
PATCH  /api/me/products/:id    — Update authenticated user's product
DELETE /api/me/products/:id    — Delete authenticated user's product
```

Creating a product as the authenticated user requires the target store ID:
```json
{
  "storeId": "cl...",
  "name": "Product name",
  "price": 1000,
  "categoryId": "cl..."
}
```

### Categories
```
GET    /api/categories/stores         — List store categories (public)
POST   /api/categories/stores         — Create store category (admin only)
PATCH  /api/categories/stores/:id     — Update store category (admin only)
DELETE /api/categories/stores/:id     — Deactivate store category (admin only)

GET    /api/categories/products       — List product categories (public)
POST   /api/categories/products       — Create product category (admin only)
PATCH  /api/categories/products/:id   — Update product category (admin only)
DELETE /api/categories/products/:id   — Deactivate product category (admin only)
```

### Templates
```
GET   /api/templates          — List active templates (public, filter: ?type=STORE)
POST  /api/templates          — Create template (admin only)
GET   /api/templates/:code    — Get template by code (public)
PATCH /api/templates/:code    — Update template (admin only)
```

### Marketplace
```
GET /api/marketplace          — Search & filter stores
  ?q=query                    — Search by name or description
  ?categoryId=xxx             — Filter by category
  ?city=Lagos                 — Filter by city
  ?country=Nigeria            — Filter by country
  ?page=1&limit=20            — Pagination
```

### Query Parameters (pagination)
All list endpoints support: `?page=1&limit=20`

### Authentication
Pass the Supabase access token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### WhatsApp Order Links
Every product response includes a `whatsappOrderLink` field when the store has a phone number:
```
https://wa.me/2348012345678?text=I%20want%20Royal%20Agbada%20Set%20-%2045000
```

---

## Template System

Templates control how storefronts render on the frontend. Each template has a `config` JSON:

```json
{
  "layout": "grid",
  "heroStyle": "banner",
  "showCategories": true,
  "productCardStyle": "modern",
  "primaryColor": "#ff6600",
  "showWhatsappButton": true,
  "columns": 3
}
```

Built-in template types:
- `STORE` — general merchandise
- `CHURCH` — church community pages
- `TEAM` — sports team profiles
- `PORTFOLIO` — personal/agency portfolios
- `RESTAURANT` — food & dining

---

## Production Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel dashboard:
- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for seeding Supabase Auth users; keep server-only)
- `NODE_ENV=production`

Run migrations post-deploy:
```bash
npx prisma migrate deploy
```

---

## Database Management

```bash
npm run db:studio      # Open Prisma Studio (visual DB editor)
npm run db:push        # Push schema without migration (dev only)
npm run db:reset       # Reset database (⚠️ destroys all data)
```
