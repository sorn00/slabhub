# Quarriva — Zillow for Stone Countertops

**quarriva.com** · **slabhub.vercel.app**

AI-powered marketplace connecting homeowners searching for stone countertops with local fabricators who can install them. Browse 390+ stone slabs from MSI Surfaces, get instant quotes, and book jobs through vetted local pros.

---

## What It Does

Homeowners browse through hundreds of quartz, granite, marble, and quartzite slabs — each with real MSI imagery, pricing, and availability data. When they find stones they like, they request quotes. Quarriva matches them with a local fabricator in their area, routes the lead into GHL CRM, and manages the full pipeline from inquiry to closed deal.

Fabricators get a free directory profile, can claim and manage it, receive exclusive leads by text, and pay only when they accept a lead. Admins manage pricing, outreach campaigns, ad performance, content, and the entire GHL opportunity pipeline from a unified dashboard.

## Features

- **Stone Catalog** — 391+ stones from MSI Surfaces with real images, material, color, and retail pricing per square foot. Filtered by color, material, and search.
- **Instant Quote Calculator** — Multi-slab quoting with customizable sqft, splash, sink cutout, and edge profile. Real-time price breakdown with detailed line items.
- **Fabricator Directory** — Browse by state and city. Each fabricator profile shows reviews, services, and a quote request form. Fabricators can claim and manage their profiles.
- **CRM Dashboard** — Full pipeline view with GHL integration: leads inbox, opportunity stages, message staging with approval workflow, AI message rewriting, outreach queue management.
- **Lead Management** — Lead scoring and priority classification (HOT/WARM/COLD) based on inbound message recency and responsiveness. Direct SMS from the dashboard via GHL conversations.
- **Outreach Engine** — Queue-based outreach to new contacts. Draft → review → approve → send workflow. Sent messages tracked in GHL.
- **Quote Requests with Photo Uploads** — Homeowners upload kitchen sketches/photos alongside their quote request. PDF quote generation and delivery via email.
- **Cabinet Quoting** — Separate cabinet estimation tool with downloadable quote PDFs.
- **Partner Markets** — City-based partner pages for local service providers. Waitlist and application system.
- **Admin Panel** — Manage fabricators, leads, GHL opportunities, stone pricing, specials/promos, featured stones, and full quote management.
- **SEO-Optimized Pages** — Dynamic city/state stone pages, blog with AI-generated content, ISR-based revalidation, canonical URLs, and auto-generated sitemaps.
- **Stripe Payments** — Fabricator card setup for lead payments.
- **Design Inspiration** — User-submitted kitchen designs gallery.
- **ROI Calculator** — Interactive tool showing countertop upgrade value impact.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| Database (prod) | PostgreSQL (Neon serverless) |
| Database (dev) | SQLite via better-sqlite3 |
| Auth | NextAuth.js v5 (Credentials + JWT) |
| Payments | Stripe (Setup Intents for fabricators) |
| AI | OpenAI (GPT-4o / GPT-4o-mini for content & messaging) |
| CRM | GoHighLevel API (contacts, opportunities, conversations, messages) |
| Email | Nodemailer (Gmail SMTP) |
| Scraping | Cheerio (MSI Surfaces stone data) |
| HTTP | Axios + native https |
| Hosting | Vercel |
| DB Hosting | Neon (serverless PostgreSQL) |

## Getting Started

### Prerequisites

- Node.js >= 20
- npm
- A Neon PostgreSQL database (or local Postgres)
- A GHL account with API access (for CRM features)
- An OpenAI API key (for AI features)

### Setup

```bash
# Clone the repo
git clone https://github.com/sorn00/slabhub.git
cd slabhub

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your keys (see Environment Variables below)

# Initialize database schema
# The app auto-creates tables on first request, or run:
node scripts/migrate-to-postgres.js

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

The app supports **dual database backends**:
- **PostgreSQL** (default) — set `DATABASE_URL` in `.env.local`. Used in production on Neon.
- **SQLite** — fallback for local development without a Postgres instance. Auto-created at `data/slabhub.db`.

Schema is initialized automatically on first database connection. Tables: `users`, `favorites`, `quote_requests`, `quote_files`, `staged_messages`, plus GHL-related tables managed through a separate SQLite database (`ghl.db`).

## Environment Variables

All required environment variables. Add these to `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon or other) |
| `NEXTAUTH_SECRET` | NextAuth secret key for JWT signing |
| `NEXTAUTH_URL` | Base URL for auth callbacks (e.g. `http://localhost:3000`) |
| `AUTH_SECRET` | Alternative NextAuth secret |
| `GHL_TOKEN` | GoHighLevel API bearer token |
| `GHL_LOCATION_ID` | GHL location/agency ID |
| `GHL_PIPELINE_ID` | GHL pipeline ID for opportunity tracking |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `GMAIL_USER` | Gmail address for sending email |
| `GMAIL_APP_PASSWORD` | Gmail app-specific password |
| `GMAIL_FROM` | From address for outgoing emails (defaults to `quotes@quarriva.com`) |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side) |
| `ADMIN_PASSWORD` | Admin login password (cookie-based auth) |
| `NEXT_PUBLIC_BASE_URL` | Public base URL for the site |
| `NODE_ENV` | `development` or `production` |

## Project Structure

```
slabhub/
├── app/
│   ├── layout.tsx                 # Root layout + metadata
│   ├── page.tsx                   # Homepage (redirects to /stones)
│   ├── globals.css                # Global styles (Tailwind + custom)
│   ├── robots.ts                  # robots.txt generation
│   ├── sitemap.ts                 # Dynamic sitemap generation
│   ├── stones/                    # Stone catalog + detail pages
│   │   ├── page.tsx               # Full catalog with filters
│   │   ├── detail/[slug]/         # Individual stone detail
│   │   └── [state]/[city]/        # Location-based stone pages
│   ├── directory/                 # Fabricator directory
│   │   ├── page.tsx               # Directory listing
│   │   └── [slug]/               # Individual fabricator profile
│   ├── crm/                       # CRM dashboard (admin)
│   │   ├── page.tsx               # CRM home + stats
│   │   ├── leads/                 # Lead inbox + management
│   │   ├── pipeline/              # GHL opportunity pipeline
│   │   ├── outreach/              # Outreach queue
│   │   ├── messages/              # Message staging
│   │   ├── quotes/                # Quote management
│   │   ├── pricing/               # Stone pricing admin
│   │   ├── ads/                   # Ad performance
│   │   ├── sketch/                # Sketch/photo viewer
│   │   ├── fabricators/           # Fabricator management
│   │   ├── partners/              # Partner market management
│   │   ├── compose/               # Compose messages
│   │   ├── settings/              # CRM settings
│   │   └── feedback/              # Message feedback review
│   ├── admin/                     # Admin panel
│   │   ├── page.tsx               # Admin dashboard (fabricators, specials, pricing, quotes)
│   │   └── login/                 # Admin login page
│   ├── cabinets/                  # Cabinet quoting tool
│   ├── partners/                  # Partner markets (public)
│   ├── blog/                      # Blog + article pages
│   ├── countertops/               # State/city countertop landing pages
│   ├── quote/                     # Quote request page
│   ├── fabricators/               # Fabricator registration + card setup
│   ├── dashboard/                 # Customer dashboard (favorites, quotes)
│   ├── login/ + register/         # Customer auth pages
│   ├── claim/                     # Fabricator profile claiming
│   ├── promo/                     # Promo/specials pages
│   ├── design/                    # Design inspiration gallery
│   └── api/                       # ~60 API route handlers
│       ├── auth/[...nextauth]/    # NextAuth handlers
│       ├── admin/                 # Admin API (leads, pricing, GHL, quotes, fabricators, specials)
│       ├── crm/                   # CRM API (leads, messages, pricing, outreach, AI, ads, sketch)
│       ├── directory/             # Directory API (claims, reviews, quote requests)
│       ├── partners/              # Partner API (applications, markets, waitlist)
│       ├── quote-requests/        # Quote request CRUD + uploads
│       ├── favorites/             # Favorites CRUD
│       ├── cabinets/              # Cabinet quote API
│       ├── stones/                # Stone search + promo API
│       ├── outreach-queue/        # Outreach queue management
│       ├── webhook/ghl/           # GHL webhook receiver
│       └── register/              # User registration
├── components/
│   ├── Navbar.tsx                 # Main navigation
│   ├── SessionProvider.tsx        # NextAuth session wrapper
│   ├── ROICalculator.tsx          # ROI calculator widget
│   ├── StripePaymentStep.tsx      # Stripe payment component
│   ├── crm/                       # CRM-specific components (PipelineBar, StagedMessageCard)
│   └── directory/                 # Directory components (ClaimForm, Reviews, Search, QuoteForm)
├── lib/
│   ├── db.ts                      # Database adapter (Postgres primary)
│   ├── db-postgres.ts             # PostgreSQL schema + helpers
│   ├── auth.ts                    # NextAuth configuration
│   ├── ghl-api.ts                 # GHL messaging API (native https)
│   ├── ghl-contacts.ts            # GHL contact CRUD
│   ├── ghl-db.ts                  # GHL SQLite database reader
│   ├── quote-calculator.ts        # Quote pricing engine
│   ├── routing.ts                 # Zip-to-state routing + fabricator matching
│   └── email.ts                   # Email templates + Nodemailer
├── scripts/
│   ├── generate-seo-content.js    # AI-powered SEO article generator
│   ├── scrape-msi.js              # MSI Surfaces stone scraper
│   ├── migrate-to-postgres.js     # SQLite → PostgreSQL migration
│   ├── seed-cabinets.js           # Cabinet catalog seeder
│   ├── seed-ct-fabricators.js     # Connecticut fabricator seeder
│   ├── generate-msi-seo.js        # MSI stone SEO page generator
│   ├── download-all-images.js     # Bulk image downloader
│   └── daily-single-article.js    # Daily SEO article generator
├── data/                          # SQLite databases + JSON data
├── public/                        # Static assets
├── middleware.ts                  # Auth gating + www redirect
├── next.config.mjs                # Next.js config
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript config
├── vercel.json                    # Vercel deployment config
└── package.json
```

## Deployment

### Vercel + Neon (Production)

1. Push to GitHub
2. Import project in Vercel
3. Set all environment variables in Vercel dashboard
4. Connect a Neon PostgreSQL database
5. Deploy — Vercel auto-detects Next.js

The app is live at:
- **quarriva.com** (primary domain)
- **slabhub.vercel.app** (Vercel preview)

### Local Development

```bash
npm run dev
# Runs on http://localhost:3000
```

For SQLite mode (no Postgres needed locally), the database auto-creates at `data/slabhub.db`.

## Links

- **Production:** [quarriva.com](https://quarriva.com)
- **Preview:** [slabhub.vercel.app](https://slabhub.vercel.app)
- **Repository:** [github.com/sorn00/slabhub](https://github.com/sorn00/slabhub)

## License

Proprietary. All rights reserved.
