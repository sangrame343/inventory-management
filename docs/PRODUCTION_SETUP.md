# Production Setup

## Overview

Production deployment uses:

| Service | Role |
|---|---|
| **Supabase** | PostgreSQL database + file storage |
| **Vercel** | Application hosting (Next.js) |
| **GitHub** | Source code repository |

---

## 1. Supabase PostgreSQL Setup

### Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users (e.g., `ap-southeast-2` for Asia-Pacific)
3. Set a strong database password
4. Wait for the project to finish provisioning

### Get Connection Strings

Navigate to **Project Settings → Database → Connection String**:

- **Pooled connection** (Transaction mode): Used as `DATABASE_URL` — goes through PgBouncer for connection pooling
- **Direct connection**: Used as `DIRECT_URL` — required for Prisma migrations

```
# Pooled (for application runtime)
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require

# Direct (for migrations)
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

> **Important:** Always use the **direct connection** (`DIRECT_URL`) for running `prisma migrate deploy`. The pooled connection via PgBouncer does not support DDL statements reliably.

---

## 2. Supabase Storage Buckets

Create two **private** storage buckets in Supabase Dashboard → Storage:

| Bucket Name | Access | Purpose |
|---|---|---|
| `asset-signatures` | **Private** | Stores PNG digital signatures from acknowledgements |
| `asset-receipts` | **Private** | Stores generated PDF handover receipts |

### Bucket Configuration

1. Navigate to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Name: `asset-signatures`, toggle **Private** ON
4. Repeat for `asset-receipts`

> **Do NOT** make these buckets public. Signatures and receipts contain PII and should only be accessed via signed URLs generated server-side.

### Storage RLS Policies

Since the application uses the **service role key** (server-side only), you don't need to create RLS policies for these buckets. The service role key bypasses RLS.

> **Warning:** Never expose the Supabase service role key to the client. It should only be used in server-side code (API routes, server actions).

---

## 3. Supabase Environment Variables

From your Supabase project, gather:

| Variable | Where to Find |
|---|---|
| `SUPABASE_URL` | Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → Service Role Key (secret!) |

---

## 4. Vercel Setup

### Connect Repository

1. Go to [https://vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel auto-detects Next.js and sets the correct build configuration

### Build Configuration

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build Command | `next build` (auto-detected) |
| Install Command | `npm install` (runs `prisma generate` via postinstall) |
| Output Directory | `.next` (auto-detected) |

### Required Environment Variables

Set these in **Vercel → Project Settings → Environment Variables**:

```env
# Database (from Supabase)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require"

# Auth
AUTH_SECRET="<generate-a-strong-random-string>"
AUTH_URL="https://your-app.vercel.app"

# Supabase Storage
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

> **Generate AUTH_SECRET:** Run `openssl rand -base64 32` or use [generate-secret.vercel.app](https://generate-secret.vercel.app)

---

## 5. First Production Deployment

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### Step 2: Vercel Auto-Deploys

Once the GitHub repo is connected, Vercel will automatically build and deploy on every push to `main`.

### Step 3: Run Production Migrations

After the first deploy, run migrations against the production database:

```bash
# Set DIRECT_URL temporarily (or use .env.production)
npx prisma migrate deploy
```

> **Critical:** Use `prisma migrate deploy` in production, NEVER `prisma migrate dev` or `prisma db push`.

### Step 4: Verify

1. Visit your Vercel deployment URL
2. Register the first user (this user should be promoted to SUPER_ADMIN)
3. Verify login works
4. Verify database connection by checking the dashboard

---

## 6. Post-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] `prisma migrate deploy` ran successfully against Supabase
- [ ] Both storage buckets created (`asset-signatures`, `asset-receipts`)
- [ ] Login/registration working
- [ ] Company created and accessible
- [ ] Test an asset creation
- [ ] Test acknowledgement link generation
- [ ] Verify backup export works (super admin only)

---

## 7. Custom Domain (Optional)

1. In Vercel: **Settings → Domains → Add**
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update `AUTH_URL` environment variable to your custom domain
5. Redeploy for the change to take effect
