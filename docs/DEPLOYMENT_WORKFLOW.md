# Deployment Workflow

## Environments

| Environment | Database | Hosting | Purpose |
|---|---|---|---|
| **Local** | Docker PostgreSQL (`localhost:5432`) | `npm run dev` (localhost:3000) | Development & testing |
| **Production** | Supabase PostgreSQL | Vercel | Live application |

---

## Development Workflow

### 1. Local Development with Docker DB

```bash
# Start Docker PostgreSQL (if not running)
docker start inventory-pg

# Start development server
npm run dev

# Open http://localhost:3000
```

### 2. Make Changes

- Edit code in `src/`
- For schema changes: edit `prisma/schema.prisma`
- Hot reload will reflect code changes immediately

### 3. Schema Changes (If Any)

```bash
# Create and apply migration locally
npx prisma migrate dev --name describe_your_change

# This:
# 1. Generates SQL migration file
# 2. Applies it to local Docker DB
# 3. Regenerates Prisma client
```

### 4. Test Locally

- Verify the feature works
- Check for console errors
- Test edge cases
- Test with different roles (SUPER_ADMIN, ADMIN, USER)

---

## Git Branch Workflow

### Recommended Branch Strategy

```
main (production)
├── develop (staging/integration)
│   ├── feature/add-new-module
│   ├── fix/prisma-foreign-key-error
│   └── chore/update-dependencies
```

### Simple Workflow (Solo Developer)

```bash
# Work directly on main (or a feature branch)
git add .
git commit -m "feat: add new inventory feature"
git push origin main
```

### Team Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Work on changes...
git add .
git commit -m "feat: implement new feature"

# Push and create PR
git push origin feature/my-feature
# Create Pull Request on GitHub
# Merge to main after review
```

---

## Deployment Steps

### Step 1: Commit and Push

```bash
git add .
git commit -m "descriptive commit message"
git push origin main
```

### Step 2: Vercel Auto-Deploys

When connected to GitHub, Vercel automatically:
1. Detects the push to `main`
2. Runs `npm install` (which triggers `prisma generate` via postinstall)
3. Runs `next build`
4. Deploys the built application

You can monitor the build at [https://vercel.com/dashboard](https://vercel.com/dashboard).

### Step 3: Production Migration (If Schema Changed)

If your commit includes new migration files in `prisma/migrations/`:

```bash
# Option A: Run from local machine with production credentials
# Set DIRECT_URL to your Supabase direct connection temporarily
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require" npx prisma migrate deploy

# Option B: Use .env.production file
# Ensure .env.production has the correct DIRECT_URL
npx dotenv -e .env.production -- npx prisma migrate deploy
```

> **Important:** Always use `prisma migrate deploy` for production. Never `migrate dev` or `db push`.

### Step 4: Verify

1. Visit your production URL
2. Login and check core functionality
3. Test the specific changes you deployed
4. Check Vercel logs for any errors

---

## Migration Deployment in Detail

### What `prisma migrate deploy` Does

1. Connects to the production database via `DIRECT_URL`
2. Reads the `_prisma_migrations` table
3. Compares with migration files in `prisma/migrations/`
4. Applies any pending migrations in order
5. Records each migration in `_prisma_migrations`

### What It Does NOT Do

- Does NOT generate new migrations
- Does NOT drop tables
- Does NOT reset data
- Does NOT modify existing migration files

---

## Rollback Procedures

### Rolling Back Code Changes

```bash
# Revert the last commit
git revert HEAD
git push origin main
# Vercel will auto-deploy the reverted code
```

### Rolling Back Database Migrations

Prisma does not have a built-in rollback command. To reverse a migration:

1. **Create a new migration** that undoes the change:
   ```bash
   npx prisma migrate dev --name revert_previous_change
   ```
   Write the reverse SQL manually in the generated migration file.

2. **Apply to production:**
   ```bash
   npx prisma migrate deploy
   ```

### Emergency Database Recovery

If a migration corrupts production data:

1. **Stop the application** (if possible) by disabling the Vercel deployment
2. **Restore from backup:**
   - Use the backup SQL dump generated from `/api/backup?target=prod`
   - Connect to Supabase via `psql` or the Supabase SQL editor
   - Run the backup SQL to restore data
3. **Fix the schema issue** with a corrective migration
4. **Re-deploy**

---

## CI/CD Pipeline (Current Setup)

```
Developer pushes to main
        │
        ▼
   GitHub Repository
        │
        ▼
   Vercel Build System
   ┌─────────────────────┐
   │ 1. npm install       │  ← prisma generate runs via postinstall
   │ 2. next build        │  ← TypeScript compilation + bundling
   │ 3. Deploy            │  ← Edge network distribution
   └─────────────────────┘
        │
        ▼
   Production Live
        │
        ▼
   Developer runs:
   npx prisma migrate deploy  ← Manual step for schema changes
```

> **Note:** Database migrations are a manual step. They are NOT automatically run during Vercel deployment. You must run `prisma migrate deploy` separately after deploying code that includes new migrations.

---

## Pre-Deployment Checklist

- [ ] Code tested locally with Docker PostgreSQL
- [ ] Schema changes have migration files committed
- [ ] No secrets or credentials in committed code
- [ ] `.env` and `.env.production` are in `.gitignore`
- [ ] Build passes locally: `npm run build`
- [ ] All environment variables set in Vercel dashboard
- [ ] Supabase storage buckets created (if using new buckets)

---

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Login works
- [ ] Company switcher works
- [ ] New features function correctly
- [ ] Database migrations applied (if any): `prisma migrate deploy`
- [ ] Check Vercel deployment logs for errors
- [ ] Verify backup export still works (super admin)
