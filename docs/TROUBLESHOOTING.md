# Troubleshooting Guide

## Common Errors and Fixes

---

### 1. Prisma P2003 — Foreign Key Constraint Error

**Error message:**
```
Error: Invalid `prisma.asset.delete()` invocation:
Foreign key constraint failed on the field: `AssetAssignment_assetId_fkey`
```

**Cause:** Trying to delete a record that has related records referencing it.

**Fix:**
- Delete related records first (assignments, transfers, tickets)
- OR configure cascade delete on the relation in `schema.prisma`:
  ```prisma
  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  ```
- Then create a new migration: `npx prisma migrate dev --name fix_cascade`

**Prevention:** Check the schema for `onDelete` rules before deleting parent records.

---

### 2. Supabase RLS Warnings

**Warning in Supabase Dashboard:**
```
⚠️ Row Level Security is not enabled for table "Asset"
```

**Cause:** Supabase flags tables without RLS policies.

**Fix:** This is expected and safe to ignore. The application uses the service role key which bypasses RLS. Security is enforced at the application level.

**If you want to silence the warning:**
1. Enable RLS on the table in Supabase Dashboard
2. Create a permissive policy: `USING (true)` for the service role
3. Be careful not to break application access

---

### 3. Prisma Client Build Error

**Error message:**
```
Error: @prisma/client did not initialize yet. Please run "prisma generate"
```

**Fix:**
```bash
npx prisma generate
```

**In Vercel builds:** This is handled automatically by the `postinstall` script in `package.json`:
```json
"postinstall": "prisma generate"
```

If it still fails on Vercel:
1. Check that `prisma` is in `devDependencies`
2. Check that `@prisma/client` is in `dependencies`
3. Check Vercel build logs for generation errors

---

### 4. Vercel Environment Variable Issues

**Symptoms:**
- Login not working after deployment
- Database connection failures
- Storage uploads failing
- "AUTH_SECRET is not set" errors

**Fix:**
1. Go to Vercel → Project Settings → Environment Variables
2. Verify all required variables are set:
   - `DATABASE_URL` — must use Supabase pooled connection (port 6543)
   - `DIRECT_URL` — must use Supabase direct connection (port 5432)
   - `AUTH_SECRET` — must be a strong random string
   - `AUTH_URL` — must match your deployment URL exactly
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — your service role key
3. **Redeploy** after changing environment variables (changes don't take effect until next deploy)

---

### 5. `psql` Not Recognized on Windows

**Error message:**
```
'psql' is not recognized as an internal or external command
```

**Cause:** PostgreSQL client tools are not in your system PATH.

**Fixes:**

**Option A: Use Docker exec instead:**
```bash
docker exec -it inventory-pg psql -U postgres -d inventory_management
```

**Option B: Install PostgreSQL client tools:**
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
2. During installation, select "Command Line Tools"
3. Add to PATH: `C:\Program Files\PostgreSQL\16\bin`

**Option C: Use pgAdmin or DBeaver (GUI tools):**
- No command line needed
- Connect with: `localhost:5432`, user: `postgres`, password: `postgres`

---

### 6. Supabase Storage Upload Error

**Error message:**
```
Failed to upload to Supabase: new row violates row-level security policy
```

**Cause:** RLS policy on the storage bucket is blocking uploads.

**Fix:**
1. Check that you're using the **service role key** (not the anon key)
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly in environment variables
3. Check that the bucket exists in Supabase Storage dashboard
4. Verify bucket names match exactly: `asset-signatures` and `asset-receipts`

**Alternative error:**
```
Failed to upload to Supabase: Bucket not found
```

**Fix:** Create the bucket in Supabase Dashboard → Storage → New Bucket.

---

### 7. Login Not Working After Deployment

**Symptoms:**
- Credentials are correct but login fails
- Login redirects back to login page
- "CSRF token mismatch" errors

**Possible causes and fixes:**

**Cause A: AUTH_SECRET changed**
- If you changed `AUTH_SECRET`, all existing JWT tokens are invalid
- Fix: Clear browser cookies and try again

**Cause B: AUTH_URL mismatch**
- `AUTH_URL` must match your deployment URL exactly
- Including protocol (`https://`) and no trailing slash
- Fix: Update AUTH_URL in Vercel env vars and redeploy

**Cause C: Database not connected**
- Check Vercel function logs for database connection errors
- Verify `DATABASE_URL` is correct in Vercel env vars

**Cause D: User status is PENDING**
- New users start as PENDING
- Super Admin must approve the user first
- Error message should say "Your registration is pending approval"

---

### 8. Local Docker DB Not Connecting

**Error message:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Fixes:**

**Check if Docker container is running:**
```bash
docker ps
# Look for inventory-pg in the list
```

**Start the container:**
```bash
docker start inventory-pg
```

**Check if port 5432 is available:**
```bash
# Windows
netstat -ano | findstr :5432
```

**If Docker is not installed:**
- Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
- Restart your computer after installation

**If the container doesn't exist:**
```bash
docker run --name inventory-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inventory_management -p 5432:5432 -d postgres:16
```

---

### 9. Prisma Migration Conflicts

**Error message:**
```
Error: P3006 — Migration failed to apply cleanly to the shadow database
```

**Cause:** Schema changes conflict with existing migrations.

**Fix for local:**
```bash
# Reset and re-apply all migrations (DESTROYS LOCAL DATA)
npx prisma migrate reset
```

**Fix for production:** Never reset production. Create a new migration that resolves the conflict.

---

### 10. `next build` TypeScript Errors

**Error message:**
```
Type error: Property 'X' does not exist on type 'Y'
```

**Common causes:**
- Prisma client not regenerated after schema change
- Missing type definitions for session extensions

**Fix:**
```bash
npx prisma generate
npm run build
```

---

### 11. TanStack Query Cache Issues

**Symptoms:**
- Data not refreshing after mutations
- Stale data showing after create/update/delete

**Fix:**
- Ensure `queryClient.invalidateQueries()` is called after mutations
- Check that query keys match between fetching and invalidation
- Hard refresh: Clear browser cache or open in incognito

---

### 12. Docker PostgreSQL Data Persistence

**Symptoms:**
- Data lost after `docker stop` + `docker start`

**Cause:** Docker container was removed with `docker rm` instead of just stopped.

**Fix:** Use named volumes for persistent data:
```bash
docker run --name inventory-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=inventory_management \
  -p 5432:5432 \
  -v inventory-data:/var/lib/postgresql/data \
  -d postgres:16
```

The `-v inventory-data:/var/lib/postgresql/data` flag creates a persistent Docker volume.

---

### 13. "Module not found" Errors

**Error message:**
```
Module not found: Can't resolve '@/components/...'
```

**Fix:**
- Check `tsconfig.json` for path aliases:
  ```json
  "paths": { "@/*": ["./src/*"] }
  ```
- Ensure the file exists at the expected path
- Restart the dev server: `Ctrl+C` then `npm run dev`

---

### 14. Acknowledgement Link Not Working

**Symptoms:**
- "Invalid or expired acknowledgement link" error
- Link was working before but stopped

**Possible causes:**

| Cause | Fix |
|---|---|
| Token expired | Generate a new acknowledgement link |
| Already acknowledged | Check status in the acknowledgements page |
| Wrong URL | Verify the link matches production URL |
| Token hash corrupted | Regenerate the acknowledgement |
| Database migration pending | Run `prisma migrate deploy` |

---

## Debugging Tips

### View Vercel Function Logs
1. Go to Vercel Dashboard → Project → Deployments
2. Click on a deployment → Functions tab
3. View real-time logs for API routes and server actions

### View Local Server Logs
Check the terminal running `npm run dev` for:
- Console.log output from server actions
- Prisma query logs (warn + error level)
- NextAuth initialization messages

### Check Database State
```bash
# Local
docker exec -it inventory-pg psql -U postgres -d inventory_management
\dt           # List tables
SELECT * FROM "User" LIMIT 5;
SELECT * FROM "_prisma_migrations";  # Check migration status
```

### Clear Next.js Cache
```bash
# Delete build cache
rm -rf .next
npm run dev
```
