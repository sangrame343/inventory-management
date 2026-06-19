# Local Development Setup

## Prerequisites

Install the following software before starting:

| Software | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ (LTS recommended) | JavaScript runtime |
| **npm** | 10+ (bundled with Node) | Package manager |
| **Docker Desktop** | Latest | Local PostgreSQL database |
| **Git** | Latest | Version control |
| **VS Code** (recommended) | Latest | Code editor |

### Recommended VS Code Extensions

- Prisma (`prisma.prisma`)
- Tailwind CSS IntelliSense
- ESLint
- Pretty TypeScript Errors

---

## Step 1: Clone the Repository

```bash
git clone <repo-url>
cd inventory-management
```

---

## Step 2: Start Docker PostgreSQL

```bash
docker run \
  --name inventory-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=inventory_management \
  -p 5432:5432 \
  -d postgres:16
```

**Verify the container is running:**

```bash
docker ps
```

You should see `inventory-pg` listed.

**To start the container again after a reboot:**

```bash
docker start inventory-pg
```

**To stop the container:**

```bash
docker stop inventory-pg
```

---

## Step 3: Create `.env` File

Create a `.env` file in the project root with the following content:

```env
# Database connection for Prisma queries (used at runtime)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/inventory_management?schema=public"

# Direct connection for Prisma migrations (bypasses connection poolers)
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/inventory_management?schema=public"

# NextAuth secret — any random string for local dev
AUTH_SECRET="development_secret_do_not_use_in_production"

# Application URL
AUTH_URL="http://localhost:3000"
```

> **Note:** In local development, Supabase environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are NOT required. The storage service will fall back to local filesystem storage under `public/uploads/`.

---

## Step 4: Install Dependencies

```bash
npm install
```

This will also run `prisma generate` automatically (configured in `postinstall` script).

---

## Step 5: Generate Prisma Client

If you need to regenerate manually:

```bash
npx prisma generate
```

---

## Step 6: Run Database Migrations

```bash
npx prisma migrate dev
```

This will:
1. Create all database tables defined in `prisma/schema.prisma`
2. Apply all pending migrations from `prisma/migrations/`
3. Generate the Prisma client

---

## Step 7: Seed the Database (Optional)

```bash
npx prisma db seed
```

This runs `prisma/seed.ts` and creates sample data including:
- Default super admin user
- Sample companies
- Sample departments, locations, categories
- Sample assets

---

## Step 8: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Common Local Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server (with hot reload) |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server locally |
| `npm run lint` | Run ESLint |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma migrate dev` | Create and apply new migration |
| `npx prisma migrate dev --name <name>` | Create named migration |
| `npx prisma studio` | Open Prisma visual database editor |
| `npx prisma db seed` | Run seed script |

---

## Accessing the Local Database Directly

### Via Docker exec:

```bash
docker exec -it inventory-pg psql -U postgres -d inventory_management
```

### Via pgAdmin or DBeaver:

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `inventory_management` |
| Username | `postgres` |
| Password | `postgres` |

---

## Local File Storage

In development (without Supabase configuration), uploaded files are stored locally:

```
public/uploads/
├── asset-signatures/    # Acknowledgement signature images
│   └── signatures/{companyId}/{assignmentId}.png
└── asset-receipts/      # Generated PDF receipts
    └── receipts/{companyId}/{assignmentId}.pdf
```

These files are served via the Next.js static file server or the local storage API route at `/api/admin/local-storage`.

---

## Troubleshooting Local Setup

### Docker not starting?

```bash
# Remove old container and create new one
docker rm inventory-pg
docker run --name inventory-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inventory_management -p 5432:5432 -d postgres:16
```

### Port 5432 already in use?

```bash
# Check what's using the port (Windows)
netstat -ano | findstr :5432
# Kill the process or use a different port:
docker run --name inventory-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inventory_management -p 5433:5432 -d postgres:16
# Then update DATABASE_URL to use port 5433
```

### Prisma client errors?

```bash
npx prisma generate
```

### Migration issues?

```bash
# Reset database and re-apply all migrations (DESTROYS ALL DATA)
npx prisma migrate reset
```

> **Warning:** `prisma migrate reset` deletes all data. Only use this in local development.
