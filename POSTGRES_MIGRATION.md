# Postgres Migration Guide

## Step 1 — Get your connection string
- Neon: neon.tech → create project `slabhub` → copy connection string
- Azure: Azure Portal → Azure Database for PostgreSQL → connection strings

## Step 2 — Add env vars

### Local (.env.local):
```
DATABASE_URL=postgresql://user:password@host/slabhub?sslmode=require
```

### Vercel:
- Go to slabhub project → Settings → Environment Variables
- Add `DATABASE_URL` with your connection string
- Add `NEXTAUTH_URL=https://slabhub.vercel.app`
- Add `NEXTAUTH_SECRET=slabhub-secret-2026`

## Step 3 — Install pg driver
```bash
cd /Users/sorn/.openclaw/workspace/slabhub
npm install pg @types/pg
```

## Step 4 — Run migration script
```bash
node scripts/migrate-to-postgres.js
```
This creates all tables in Postgres and migrates existing local data.

## Step 5 — Deploy
```bash
git add -A && git commit -m "Postgres migration" && git push
```
Vercel auto-deploys. Done.

## Azure SQL (future)
Azure Database for PostgreSQL Flexible Server is 100% compatible.
Same connection string format, just different host.
Monthly cost: ~$12-15/mo for smallest tier (plenty for current scale).
