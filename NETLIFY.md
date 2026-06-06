# Netlify Deployment

This project is a Next.js App Router API deployed with Netlify's automatic Next.js/OpenNext adapter.

## Build Settings

Netlify can read these from `netlify.toml`:

```txt
Build command: npm run build
Publish directory: .next
Node version: 20
```

Do not add `@netlify/plugin-nextjs` unless you intentionally want to pin a legacy adapter version. Netlify applies the current adapter automatically for Next.js 13.5+.

## Environment Variables

Add these in Netlify under Site configuration > Environment variables:

```txt
DATABASE_URL
DIRECT_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NODE_ENV=production
```

Use Supabase's pooled PostgreSQL URL for `DATABASE_URL` and the direct URL for `DIRECT_URL`.

## Database Migrations

Run migrations before or during deployment:

```bash
npm run db:migrate
```

For production, prefer running migrations intentionally from your machine or CI rather than on every Netlify build.

## Prisma Notes

The Prisma client is generated during install and build. The schema includes `native` for local development and `rhel-openssl-3.0.x`, which Prisma documents for Netlify's Node 20 serverless runtime.

`PRISMA_CLI_BINARY_TARGETS` in `netlify.toml` intentionally does not include `native`; that environment variable only accepts concrete platform targets.
