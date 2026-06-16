# Doshok — Style That Speaks

Premium Bangladeshi fashion e-commerce platform built with Next.js 16.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** NextAuth v5 (Credentials, JWT)
- **Database:** PostgreSQL + Prisma ORM
- **UI:** Tailwind CSS v4, Base UI, Framer Motion, shadcn/ui
- **Email:** Resend
- **Image Upload:** Cloudinary
- **Payments:** Cash on Delivery (COD)
- **Couriers:** Pathao, Steadfast, RedX (setup-ready)

## Local Setup

```bash
# 1. Clone and install
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Edit .env.local with your values (database, auth secret, API keys)

# 4. Start PostgreSQL and create the database
createdb doshok

# 5. Run migrations and seed
npm run db:migrate
npm run db:seed

# 6. Start dev server
npm run dev
```

## Required Environment Variables

See `.env.example` for the full list. Critical vars:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | **Min 32 chars in production.** Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | Resend API key for transactional emails |

## Database Commands

```bash
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run pending migrations
npm run db:seed       # Seed demo data
npm run cleanup:demo  # Remove demo data
```

## Build

```bash
npm run build
npm start
```

## Demo Data Cleanup

```bash
npm run cleanup:demo
```

## Credential Encryption

Payment and courier provider credentials are encrypted at rest using AES-256-GCM.

- **Payment credentials** use `PAYMENT_CREDENTIALS_SECRET` (falls back to `NEXTAUTH_SECRET` in local dev).
- **Courier credentials** use `COURIER_CREDENTIALS_SECRET` (falls back to `NEXTAUTH_SECRET` in local dev).
- Set dedicated secrets in production to isolate encryption keys from the auth secret.

## Payment & Courier Integrations

Only **Cash on Delivery (COD)** is supported for payments. Courier APIs (Pathao, Steadfast, RedX) are **setup-ready but not live**. Configure providers in the admin panel after deployment.
