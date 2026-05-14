# Quarriva Architecture

Production architecture for the Quarriva stone marketplace — a Next.js 14 application deployed on Vercel with Neon PostgreSQL, GHL CRM integration, Stripe payments, and OpenAI-powered features.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │  Stone       │  │  Fabricator  │  │  Customer    │  │  Admin/CRM   ││
│  │  Catalog     │  │  Directory   │  │  Dashboard   │  │  Dashboard   ││
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘│
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────┘
          │                 │                 │                 │
     HTTPS│            HTTPS│            HTTPS│            HTTPS│
          │                 │                 │                 │
┌─────────┴─────────────────┴─────────────────┴─────────────────┴─────────┐
│                          VERCEL EDGE (CDN)                              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    NEXT.JS 14 APP ROUTER                          │   │
│  │                                                                   │   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │ Public   │  │ Auth     │  │ Admin    │  │ CRM Dashboard    │  │   │
│  │  │ Pages    │  │ Pages    │  │ Panel    │  │ (Leads/Outreach) │  │   │
│  │  │ SSR/ISR  │  │ SSR      │  │ CSR      │  │ CSR              │  │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │   │
│  │       │             │             │                  │            │   │
│  │  ┌────┴─────────────┴─────────────┴──────────────────┴────────┐   │   │
│  │  │                     API ROUTES (~60)                       │   │   │
│  │  │  /api/auth  /api/crm  /api/admin  /api/quote-requests      │   │   │
│  │  │  /api/directory  /api/partners  /api/stones  /api/webhook  │   │   │
│  │  └────────┬──────────────┬──────────────┬─────────────────────┘   │   │
│  └───────────┼──────────────┼──────────────┼─────────────────────────┘   │
└──────────────┼──────────────┼──────────────┼─────────────────────────────┘
               │              │              │
    ┌──────────┴──────┐ ┌─────┴──────┐ ┌────┴──────────────┐
    │                 │ │            │ │                   │
    ▼                 ▼ ▼            ▼ ▼                   ▼
┌─────────┐  ┌────────────┐  ┌───────────┐  ┌──────────────────┐
│  Neon   │  │    GHL     │  │  OpenAI   │  │     Stripe       │
│  Postgres│  │    CRM     │  │   API     │  │     Payments     │
│         │  │            │  │           │  │                  │
│ Users   │  │ Contacts   │  │ GPT-4o    │  │ Setup Intents    │
│ Quotes  │  │ Opportun.  │  │ GPT-4o-mini│ │ Fabricator Cards │
│ Messages│  │ Messages   │  │           │  │                  │
│ Stones  │  │ Pipeline   │  │ SEO Gen   │  │                  │
└─────────┘  └────────────┘  └───────────┘  └──────────────────┘

┌──────────────┐  ┌──────────────┐
│   MSI        │  │   Gmail      │
│   Surfaces   │  │   SMTP       │
│   (Scraping) │  │ (Nodemailer) │
└──────────────┘  └──────────────┘
```

### Request Flow

1. **Browser** → Vercel Edge CDN → Next.js Server
2. **Public pages** (/stones, /directory, /blog) use **SSR + ISR** with on-demand revalidation
3. **CRM/Admin pages** are **client-rendered** (CSR) behind cookie-based auth, calling API routes
4. **API routes** run as Vercel serverless functions (30s max, per `vercel.json`)
5. **Auth** flow uses NextAuth.js v5 with JWT sessions stored in HTTP-only cookies
6. **Middleware** gates `/admin/*` and `/crm/*` via `admin_session` cookie

---

## Data Architecture

### Primary Database: PostgreSQL (Neon)

Live schema managed in `lib/db-postgres.ts` and `lib/db.ts`. Tables are auto-created on first connection via `CREATE TABLE IF NOT EXISTS`.

**Core Tables:**

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `users` | Customer accounts | `id` → favorites, quote_requests |
| `favorites` | Saved stone bookmarks | `user_id` → users, `stone_id` (MSI ID) |
| `quote_requests` | Inbound quote requests | `user_id` → users, `stone_id` (MSI ID) |
| `quote_files` | Uploaded PDF quotes + photos | `quote_request_id` → quote_requests |
| `staged_messages` | Outbound messages awaiting review | `contact_id` (GHL), status tracking |
| `seo_articles` | AI-generated blog content | slug-indexed, state/city/stone_type |
| `fabricators` | Fabricator profiles | state, coverage, claimed status |
| `leads` | Lead records | source, status, assigned fabricator |
| `specials` | Promotional pricing | linked to stone_id |
| `partner_markets` | City-based partner pages | community/town data |
| `partner_applicants` | Partner applications | linked to partner_markets |
| `partner_waitlist` | Waitlist for full markets | email, preferences |
| `cabinet_quotes` | Cabinet quote submissions | dimensions, material selections |
| `design_submissions` | Design inspiration gallery | image URLs, descriptions |
| `outreach_messages` | Sent outreach tracking | contact, template, status |
| `message_feedback` | Feedback on AI messages | message_id, rating |

**GHL Bridge Database:** A separate read-only SQLite database at `/Users/sorn/.openclaw/workspace/agents/ghl/ghl.db` provides a local cache of GHL contacts, opportunities, and messages for faster queries.

### Query Pattern

All database access flows through the `query()` and `queryOne()` helpers in `lib/db.ts`, which use a pooled PostgreSQL connection. Connection pooling is configured with `max: 10` connections.

```typescript
// lib/db.ts — unified query interface
import { query, queryOne } from '@/lib/db'
const rows = await query('SELECT * FROM users WHERE role = $1', ['customer'])
const user = await queryOne('SELECT * FROM users WHERE id = $1', [id])
```

---

## Component Architecture

### Layer 1: Public-Facing Pages (SSR/ISR)

| Route Group | Pages | Render Strategy | Description |
|-------------|-------|-----------------|-------------|
| `/stones` | Catalog, detail, state/city | SSR + ISR | Stone browsing with filters, pagination |
| `/directory` | Listing, profile, claim | SSR + ISR | Fabricator discovery and profiles |
| `/blog` | Index, article detail | ISR (1h) | SEO content with canonical URLs |
| `/countertops` | State, city landing pages | ISR (24h) | Location-based SEO pages |
| `/cabinets` | Quote tool, admin | SSR | Cabinet estimation flow |
| `/partners` | Market pages, apply | SSR | Partner community pages |
| `/quote` | Quote builder | CSR | Multi-stone quote request form |
| `/design` | Gallery, submit | SSR | User-submitted designs |

### Layer 2: CRM Dashboard (CSR, Admin-Only)

Protected by `middleware.ts` cookie check. All data fetched from API routes.

| Page | Function |
|------|----------|
| `/crm` | Dashboard: pipeline stats, pending messages, active quotes |
| `/crm/leads` | Lead inbox with HOT/WARM/COLD classification, priority scoring |
| `/crm/pipeline` | GHL opportunity pipeline view by stage |
| `/crm/outreach` | Outreach queue: review → approve → send workflow |
| `/crm/messages` | Staged messages: pending, sent, scheduled |
| `/crm/quotes` | Quote request management |
| `/crm/pricing` | Stone pricing editor (dealer cost, retail/sqft, slab dimensions) |
| `/crm/ads` | Facebook/Google ads performance dashboard |
| `/crm/sketch` | Customer photo/sketch viewer |
| `/crm/fabricators` | Fabricator management |
| `/crm/fabricator-outreach` | Outreach to new fabricators |
| `/crm/partners` | Partner market management |
| `/crm/compose/[contactId]` | Compose messages to specific contacts |
| `/crm/settings` | CRM configuration |
| `/crm/feedback` | AI message feedback review |

### Layer 3: Admin Panel (CSR, Admin-Only)

| Page | Function |
|------|----------|
| `/admin` | Full admin dashboard: fabricators, leads, pricing, quotes, specials, GHL management |
| `/admin/login` | Cookie-based admin authentication |

### Layer 4: API Routes (Serverless Functions)

Organized by domain — ~60 routes total. Key groups:

| Route Prefix | Purpose | Auth |
|-------------|---------|------|
| `/api/auth/[...nextauth]` | NextAuth handlers (sign in/out, session) | Public |
| `/api/admin/*` | Admin CRUD: leads, pricing, GHL ops, quotes, fabricators, specials | Admin cookie |
| `/api/crm/*` | CRM operations: leads, messages, outreach, pricing, AI rewrite, ads, sketch | Admin cookie |
| `/api/quote-requests/*` | Quote creation, listing, file upload | Customer JWT |
| `/api/favorites/*` | Stone favoriting CRUD | Customer JWT |
| `/api/directory/*` | Directory claims, reviews, quote requests | Mixed |
| `/api/partners/*` | Partner applications, markets, waitlist | Public |
| `/api/outreach-queue/*` | Outreach queue operations | Admin cookie |
| `/api/cabinets/*` | Cabinet quote CRUD | Public |
| `/api/stones/*` | Stone search, promo data | Public |
| `/api/webhook/ghl` | GHL inbound webhook receiver | GHL signature |

---

## Key Flows

### Flow 1: Homeowner Browses Stones → Gets Quote → Matched to Fabricator

```
Homeowner visits /stones
  → Browses catalog (SSR with filters)
  → Saves favorites (requires sign-in → NextAuth JWT)
  → Clicks "Get Quote" on stone detail
  → Fills quote form: sqft, splash, layout, edge, sink, photos
  → Submits → POST /api/quote-requests
  → System enters zip → lib/routing.ts getStateFromZip()
  → matchFabricator() finds local fabricator by state
  → Lead created in GHL via createGhlContact()
  → Admin notified → reviews lead in /crm/leads
  → Admin sends quote PDF via /api/admin/quotes
  → Customer downloads quote from /dashboard
```

### Flow 2: Fabricator Registers → Claims Profile → Receives Leads

```
Fabricator visits /fabricators/register
  → Submits business info, coverage area, services
  → Optionally claims existing directory profile via /claim/[slug]
  → Sets up Stripe card via SetupIntent at /fabricators/card-setup
  → Profile goes live in /directory
  → Admin adds fabricator to GHL outreach list
  → Fabricator receives lead notifications via SMS (GHL)
  → Fabricator pays per accepted lead via Stripe
```

### Flow 3: Admin Manages Pipeline → Sends Outreach → Tracks Deals

```
Admin logs in at /admin/login (cookie auth)
  → Views /crm/leads — prioritized by HOT/WARM/COLD
  → Drafts outreach message in /crm/outreach
  → Optional: uses AI rewrite via /api/crm/ai-rewrite (OpenAI)
  → Message enters staged_messages with status "pending"
  → Admin reviews and approves → status "approved"
  → System sends via /api/crm/send → GHL API
  → Message status updates to "sent"
  → Opportunities tracked in /crm/pipeline via GHL API
  → Deals move through pipeline stages: new → contacted → quoted → won/lost
```

---

## Integration Architecture

### GHL CRM Integration

```
┌──────────────────────────────────────────────────┐
│                  Quarriva App                     │
│                                                   │
│  lib/ghl-api.ts       lib/ghl-contacts.ts         │
│  ├─ sendGhlMessage()  ├─ findGhlContactByEmail()  │
│  ├─ getOrCreateConvo() ├─ createGhlContact()      │
│  └─ (native https)    ├─ updateGhlContact()       │
│                       └─ (fetch API)              │
│                                                   │
│  lib/ghl-db.ts (read-only SQLite cache)           │
│  ├─ getContacts()                                 │
│  ├─ getOpportunities()                            │
│  └─ getMessages()                                 │
│                                                   │
│  app/api/webhook/ghl/ (inbound webhooks)          │
│  app/api/admin/ghl-* (admin GHL management)       │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│              GHL API (LeadConnector)              │
│  services.leadconnectorhq.com                     │
│                                                   │
│  /contacts                  Contacts CRUD         │
│  /opportunities             Pipeline management   │
│  /conversations             Messaging             │
│  /conversations/messages    Send SMS              │
└──────────────────────────────────────────────────┘
```

**Two GHL communication patterns:**
1. **`lib/ghl-api.ts`** — Uses native Node.js `https` module (no extra deps, works in serverless). Handles message sending and conversation management.
2. **`lib/ghl-contacts.ts`** — Uses `fetch()` API. Handles contact CRUD operations.
3. **`lib/ghl-db.ts`** — Reads a local SQLite cache of GHL data synced by background scripts. Provides fast lookups without hitting GHL rate limits.

### Stripe Integration

Fabricators set up payment methods via Stripe Setup Intents:
- `components/StripePaymentStep.tsx` — Frontend card element
- `app/api/create-setup-intent/route.ts` — Server-side intent creation
- `@stripe/react-stripe-js` + `@stripe/stripe-js` — Client SDK
- Payment processed when fabricator accepts a lead

### OpenAI Integration

Two use cases:
1. **AI Message Rewriting** — `/api/crm/ai-rewrite` calls GPT-4o to polish outreach messages before sending
2. **SEO Content Generation** — `scripts/generate-seo-content.js` uses GPT-4o-mini for article generation + GPT-4o for QA review. Generates state guides, city articles, comparison posts, and buyer guides programmatically.

### MSI Surfaces Scraping

`scripts/scrape-msi.js` uses **Cheerio** to scrape stone data from MSI Surfaces:
- Stone names, materials, colors, images
- Stored in JSON files under `public/data/`
- Pricing layer added separately via admin panel (`/crm/pricing`)
- Images downloaded via `scripts/download-all-images.js`

### Email Notifications

`lib/email.ts` uses **Nodemailer** with Gmail SMTP:
- `sendQuoteEmail()` — Sends PDF quote download link to customers
- `sendLeadConfirmationEmail()` — Confirmation when a quote request is received
- `sendFabricatorOutreachEmail()` — Cold outreach to unclaimed fabricator profiles
- All emails use a branded HTML template with Quarriva header/footer

---

## SEO Architecture

### Page Types & Strategies

| Page Type | Pattern | Render | Revalidation | Example |
|-----------|---------|--------|-------------|---------|
| State landing | `/countertops/[state]` | ISR | 24h | `/countertops/massachusetts` |
| City landing | `/countertops/[state]/[town]` | ISR | 24h | `/countertops/ma/boston` |
| Stone detail | `/stones/detail/[slug]` | SSR | On-demand | `/stones/detail/calacatta-gold-quartz` |
| Location stones | `/stones/[state]/[city]` | SSR | On-demand | `/stones/ma/boston` |
| Blog index | `/blog` | ISR | 1h | — |
| Blog article | `/blog/[slug]` | ISR | 1h | `/blog/quartz-vs-granite` |
| Fabricator profile | `/directory/[slug]` | ISR | On-demand | `/directory/boston-stone-works` |
| State location | `/location/[state]` | SSR | On-demand | `/location/massachusetts` |
| Partner market | `/partners/[city]` | SSR | On-demand | `/partners/cambridge` |

### SEO Infrastructure

- **`app/sitemap.ts`** — Dynamic sitemap generation including all stone pages, directory profiles, blog articles, and location pages
- **`app/robots.ts`** — Robots.txt generation
- **`metadataBase`** — Set to `https://quarriva.com` in root layout
- **Canonical URLs** — Set per-page via Next.js Metadata API
- **Meta titles/descriptions** — Template-driven on listing pages, AI-generated on blog articles
- **OpenGraph** — Implicit via Next.js metadata (not explicitly configured)
- **`middleware.ts`** — Redirects `www.quarriva.com` → `quarriva.com` (canonical hostname)

---

## Key Design Decisions

### Dual Database Support

**Decision:** Support both PostgreSQL (Neon) and SQLite (better-sqlite3) with PostgreSQL as primary.

**Rationale:**
- PostgreSQL is the production database (Neon serverless, scales with Vercel)
- SQLite provides a zero-config local development experience
- Also used as a read cache for GHL data (`ghl.db`) — faster than API calls, avoids rate limits
- Trade-off: Schema must be maintained for both, though dev SQLite usage is minimal now

### Route Structure Discipline

**Decision:** Strict route naming conventions — never create dynamic routes with different param names at the same folder level.

**Known safe structure:**
```
/stones/detail/[slug]       — individual stone pages
/stones/[state]/[city]      — city stone listings
/directory/[slug]           — fabricator profiles
/blog/[slug]                — blog articles
/location/[state]           — state landing pages
```

Adding any new dynamic route at the same folder level with a different parameter name will cause Next.js route conflicts.

### Approve-First Outreach Pattern

**Decision:** All outbound messages go through a staged approval workflow rather than sending immediately.

**Flow:** Draft → `staged_messages` (status: `pending`) → Admin review → Approve → Send via GHL

**Rationale:** AI-generated messages need human review. This prevents bad sends, allows message polishing, and provides an audit trail. The `staged_messages` table tracks status, reviewer, and timestamps.

### Native HTTPS for GHL

**Decision:** `lib/ghl-api.ts` uses Node.js native `https` module instead of `fetch` or Axios.

**Rationale:** Zero-dependency, works in all Node.js environments including Vercel serverless. Avoids potential fetch API differences between Node versions and edge runtimes. Contact operations use `fetch` for simplicity in newer code.

---

## Security Model

### Authentication Layers

1. **Customer Auth** — NextAuth.js v5 with Credentials provider
   - Email + password → bcrypt hash verification
   - JWT-based sessions stored in HTTP-only cookies
   - Role-based access (`customer` vs `admin`)

2. **Admin Auth** — Cookie-based session (`admin_session=valid`)
   - Set via `/admin/login` page (password checked against `ADMIN_PASSWORD` env var)
   - Gated by `middleware.ts` for `/admin/*` and `/crm/*` routes
   - Both NextAuth admin role AND admin cookie are checked in CRM pages

### Route Protection

- **Middleware** (`middleware.ts`): Blocks all `/admin/*` and `/crm/*` routes unless `admin_session` cookie is valid. Redirects to login.
- **API routes**: Check for admin cookie in request headers/cookies for sensitive operations
- **NextAuth callbacks**: JWT and session callbacks include role for customer-facing auth checks

### Input Validation

- Stone IDs validated against known MSI catalog entries
- SQL parameters use parameterized queries (`$1`, `$2`) — no string concatenation
- File uploads limited to PDF and image types in quote and sketch endpoints
- Email addresses validated before storage

### Current Gaps (Documented)

- No CSRF protection on API routes (Next.js App Router doesn't include built-in CSRF for route handlers)
- No rate limiting on public endpoints
- GHL API token stored as environment variable (standard practice, but token rotation not automated)
- Admin cookie is not HTTP-only (set from client-side JS in admin login)

---

## Build & Deployment

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   GitHub     │────▶│   Vercel     │────▶│  Production  │
│   (main)     │     │   Build      │     │  quarriva.com│
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────▼───────┐
                     │  Neon        │
                     │  PostgreSQL  │
                     └──────────────┘
```

- **Build:** `next build` (standard Next.js build)
- **Runtime:** Node.js 20 on Vercel serverless functions
- **Max function duration:** 30s (`vercel.json`)
- **Static assets:** Served from Vercel Edge CDN
- **Database:** Neon serverless PostgreSQL, connection pooling with `max: 10`
- **SSL:** Enforced with `rejectUnauthorized: false` (required by some Neon configurations)

---

## Directory Structure (Actual)

```
slabhub/
├── app/                          # Next.js App Router pages + API
│   ├── admin/                    # Admin panel (login, dashboard)
│   ├── api/                      # ~60 API route handlers
│   ├── blog/                     # Blog index + article pages
│   ├── cabinets/                 # Cabinet quoting tool
│   ├── claim/                    # Fabricator profile claiming
│   ├── countertops/              # State + city SEO landing pages
│   ├── crm/                      # CRM dashboard (13 sub-pages)
│   ├── dashboard/                # Customer dashboard
│   ├── design/                   # Design inspiration gallery
│   ├── directory/                # Fabricator directory
│   ├── fabricators/              # Fabricator registration + Stripe
│   ├── location/                 # State location pages
│   ├── login/ + register/        # Customer authentication
│   ├── partners/                 # Partner marketplace
│   ├── promo/                    # Promotional pages
│   ├── quote/                    # Quote request page
│   └── stones/                   # Stone catalog (detail, state/city)
├── components/                   # Shared React components
│   ├── crm/                      # CRM-specific components
│   └── directory/                # Directory-specific components
├── lib/                          # Core library code
│   ├── db.ts                     # Database adapter (Postgres + SQLite)
│   ├── auth.ts                   # NextAuth configuration
│   ├── ghl-api.ts                # GHL messaging API
│   ├── ghl-contacts.ts           # GHL contact management
│   ├── ghl-db.ts                 # GHL local SQLite cache
│   ├── quote-calculator.ts       # Pricing engine
│   ├── routing.ts                # Zip routing + fabricator matching
│   └── email.ts                  # Email service
├── scripts/                      # CLI scripts (scraping, seeding, SEO generation)
├── data/                         # SQLite databases + JSON data files
├── public/                       # Static assets (images, stone data JSON)
├── middleware.ts                  # Auth gating + canonical hostname redirect
├── next.config.mjs                # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS config
├── vercel.json                    # Vercel deployment config
├── package.json                   # Dependencies + scripts
└── tsconfig.json                  # TypeScript configuration
```
