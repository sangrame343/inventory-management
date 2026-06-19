# Environment Variables Reference

## Local Development (`.env`)

```env
# ─────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────

# PostgreSQL connection string used by the application at runtime.
# Points to Docker PostgreSQL container.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/inventory_management?schema=public"

# Direct connection string used by Prisma for migrations.
# In local dev, this is the same as DATABASE_URL.
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/inventory_management?schema=public"

# ─────────────────────────────────────────────────────────
# AUTHENTICATION
# ─────────────────────────────────────────────────────────

# Secret used by NextAuth to sign JWT tokens.
# Use any random string for local development.
AUTH_SECRET="development_secret_do_not_use_in_production"

# Base URL of the application.
# Must match the URL where the app is running.
AUTH_URL="http://localhost:3000"

# ─────────────────────────────────────────────────────────
# SUPABASE (Optional in local dev)
# ─────────────────────────────────────────────────────────

# If NOT set, storage falls back to local filesystem (public/uploads/)
# SUPABASE_URL="https://your-project.supabase.co"
# SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

---

## Production (Vercel Environment Variables)

```env
# ─────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────

# Supabase pooled connection (via PgBouncer) for runtime queries.
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# Supabase direct connection (no pooler) for migrations and DDL.
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require"

# ─────────────────────────────────────────────────────────
# AUTHENTICATION
# ─────────────────────────────────────────────────────────

# Generate with: openssl rand -base64 32
AUTH_SECRET="<strong-random-base64-string>"

# Your production URL (must match Vercel deployment domain)
AUTH_URL="https://your-app.vercel.app"

# ─────────────────────────────────────────────────────────
# SUPABASE STORAGE
# ─────────────────────────────────────────────────────────

# Supabase project URL
SUPABASE_URL="https://[project-ref].supabase.co"

# Service role key — has FULL ACCESS to Supabase (bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

---

## Complete Variable Reference

| Variable | Required | Secret | Local | Production | Description |
|---|---|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | Docker connection | Supabase pooled connection | Primary database connection |
| `DIRECT_URL` | ✅ | ✅ | Same as DATABASE_URL | Supabase direct connection | Used for migrations |
| `AUTH_SECRET` | ✅ | ✅ | Any dev string | Strong random string | JWT signing secret |
| `AUTH_URL` | ✅ | ❌ | `http://localhost:3000` | Production URL | Base URL for auth callbacks |
| `SUPABASE_URL` | ❌ (local) / ✅ (prod) | ❌ | Not needed | Supabase project URL | Supabase API endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ (local) / ✅ (prod) | ✅ | Not needed | Service role key | Full Supabase access |

---

## ⚠️ Security Rules

### Never Expose These as `NEXT_PUBLIC_`

The following variables must **NEVER** be prefixed with `NEXT_PUBLIC_`:

| Variable | Reason |
|---|---|
| `DATABASE_URL` | Contains database credentials — would expose your entire database |
| `DIRECT_URL` | Contains database credentials — same risk as above |
| `AUTH_SECRET` | Would allow anyone to forge valid JWT tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses ALL Supabase security (RLS, auth) — full database + storage access |

> `NEXT_PUBLIC_` prefix makes variables available in client-side JavaScript bundles, visible to anyone inspecting the browser's network traffic or source code.

### Safe to Use as `NEXT_PUBLIC_` (If Needed)

| Variable | Notes |
|---|---|
| `AUTH_URL` | Only the application URL — no sensitive data |
| `SUPABASE_URL` | The project URL is public anyway (visible in Supabase dashboard) |

> However, this application does NOT use any `NEXT_PUBLIC_` variables by design. All Supabase operations happen server-side.

---

## How Variables Are Used

### `DATABASE_URL`
- **Used by:** `src/lib/db.ts` via `process.env.DATABASE_URL`
- **Purpose:** Prisma client connects to PostgreSQL
- **Local:** Docker `localhost:5432`
- **Production:** Supabase pooled connection (port 6543, PgBouncer)

### `DIRECT_URL`
- **Used by:** `prisma.config.ts` via `process.env["DIRECT_URL"]`
- **Purpose:** Prisma migrations need direct DB connection (DDL statements don't work through PgBouncer)
- **Also used by:** Backup API route as fallback for production queries

### `AUTH_SECRET`
- **Used by:** NextAuth internally
- **Purpose:** Signs and verifies JWT tokens
- **Change impact:** Changing this invalidates all existing sessions (users must re-login)

### `AUTH_URL`
- **Used by:** NextAuth for redirect URLs and callback configuration
- **Purpose:** Determines where auth callbacks redirect to
- **Must match:** The actual deployment URL (Vercel domain or custom domain)

### `SUPABASE_URL`
- **Used by:** `src/lib/storage-service.ts`
- **Purpose:** Initialise Supabase client for storage operations
- **Trailing slash:** Automatically stripped if present

### `SUPABASE_SERVICE_ROLE_KEY`
- **Used by:** `src/lib/storage-service.ts`
- **Purpose:** Authenticate with Supabase as service role (bypasses RLS)
- **Critical:** If this key leaks, an attacker has full access to your Supabase project

---

## Example `.env` for a New Developer

```env
# Copy this to .env in the project root

# Local Docker PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/inventory_management?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/inventory_management?schema=public"

# Auth (any value works locally)
AUTH_SECRET="my-local-dev-secret-change-in-production"
AUTH_URL="http://localhost:3000"

# Supabase (uncomment for storage testing)
# SUPABASE_URL="https://your-project.supabase.co"
# SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```
