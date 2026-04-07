# SlabHub Customer Portal

## Overview

Full-stack customer portal with:
- Email/password authentication (NextAuth.js v5)
- Save favorite stones with ❤️ from the catalog
- Submit quote requests per stone
- Admin uploads PDF quotes → customer downloads them
- Admin portal extended with "Customer Quotes" tab

## Tech Stack

| Layer | Tech |
|-------|------|
| Auth | NextAuth.js v5 (beta) — credentials provider |
| Database | better-sqlite3 (local SQLite file) |
| File storage | Local filesystem `/uploads/` |

## Setup

### 1. Install dependencies

```bash
npm install next-auth@beta bcryptjs better-sqlite3
npm install --save-dev @types/bcryptjs @types/better-sqlite3
```

### 2. Env vars (already in `.env.local`)

```
NEXTAUTH_SECRET=slabhub-secret-2026
NEXTAUTH_URL=http://localhost:3001
```

### 3. Run locally

```bash
npm run dev -- -p 3001
```

The SQLite database is auto-created at `data/slabhub.db` on first request.

### 4. Build for production

```bash
npm run build
```

## Routes

| Route | Purpose |
|-------|---------|
| `/login` | Customer sign in |
| `/register` | Customer sign up |
| `/dashboard` | Customer dashboard — saved stones + quote requests |
| `/stones` | Stone catalog with ❤️ save buttons |
| `/admin` → "Customer Quotes" tab | Admin uploads PDF quotes |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/register` | POST | Public | Create customer account |
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth handlers |
| `/api/favorites` | GET | Customer | List saved stones |
| `/api/favorites` | POST | Customer | Save a stone |
| `/api/favorites` | DELETE | Customer | Remove a stone |
| `/api/quote-requests` | POST | Customer | Submit quote request |
| `/api/quote-requests` | GET | Customer/Admin | List quote requests |
| `/api/quote-requests/[id]/upload` | POST | Admin cookie | Upload PDF for a request |
| `/api/quotes/download/[filename]` | GET | Customer (owner) | Download PDF quote |

## Database Schema

```sql
users              — id, name, email, password_hash, role, created_at
favorites          — id, user_id, stone_id, stone_name, stone_image, ...
quote_requests     — id, user_id, stone_id, customer_name, phone, sqft_estimate, notes, status
quote_files        — id, quote_request_id, filename, original_name, uploaded_at
```

## Customer Flow

1. Register at `/register` → auto-signed in
2. Browse `/stones` → click ❤️ to save favorites (redirects to login if not signed in)
3. `/dashboard` → Saved Stones tab → click **Request Quote** → fill form → submit
4. `/dashboard` → Quote Requests tab → when status shows "✓ Quote Ready" → download PDF

## Admin Flow

1. Sign in at `/admin/login` (existing cookie-based admin auth)
2. Go to `/admin` → click **🏠 Customer Quotes** in sidebar
3. See all submitted requests with customer name, stone, sqft, notes
4. Click **⬆ Upload PDF Quote** → pick PDF → auto-uploaded, customer can download

## Vercel Deployment Notes

> **Important:** better-sqlite3 and local file storage will NOT work on Vercel (ephemeral filesystem, no native modules in edge).
> 
> For production deployment, swap these out:
> - **Database:** Vercel Postgres, PlanetScale, or Turso (libsql)
> - **File storage:** Vercel Blob, AWS S3, or Cloudflare R2
> - **Auth:** NextAuth works fine on Vercel — just update `NEXTAUTH_URL`

For now this setup runs perfectly locally and on any VPS/dedicated server.
