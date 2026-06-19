# Security Documentation

## Authentication

### How Auth Works

```
Login Request
  → Credentials Provider (email + password)
    → Prisma lookup: User by email
      → Bcrypt comparison: password vs passwordHash
        → Status check: PENDING → reject, REJECTED → reject
          → JWT token created with claims:
            - id, email, name
            - activeCompanyId
            - role (per-company)
            - companyIds (all companies)
            - isSuperAdmin
```

### JWT Strategy

The application uses **JWT sessions** (not database sessions):

- Token is stored in an HTTP-only cookie
- Token is signed with `AUTH_SECRET`
- Token contains user identity + role + company context
- Token is validated on every request by middleware

### Password Security

- Passwords hashed with `bcryptjs` before storage
- Original passwords are never stored or logged
- Password comparison done server-side only

---

## Role-Based Access Control (RBAC)

### Three-Layer Protection

```
Layer 1: Middleware (proxy.ts)
  → Route-level blocking based on role
  → Prevents page access before rendering

Layer 2: Server Components (layout.tsx, page.tsx)
  → Auth check with redirect
  → Data scoped to activeCompanyId

Layer 3: Server Actions & API Routes
  → requireActiveCompany() — auth + tenant isolation
  → checkPermission() — role + module + action check
```

### Middleware Route Protection (`proxy.ts`)

| Route Pattern | SUPER_ADMIN | ADMIN | USER |
|---|---|---|---|
| `/dashboard` | ✅ | ✅ | ✅ |
| `/assets` | ✅ | ✅ | ✅ |
| `/inventory` | ✅ | ✅ | ❌ |
| `/maintenance` | ✅ | ✅ | ❌ |
| `/employees` | ✅ | ✅ | ❌ |
| `/transfers` | ✅ | ✅ | ❌ |
| `/settings` | ✅ | ✅ | ❌ |
| `/approvals` | ✅ | ❌ | ❌ |
| `/my-requests` | ❌ | ✅ | ❌ |
| `/super-admin` | ✅ | ❌ | ❌ |
| `/acknowledge/*` | Public | Public | Public |

### Server-Side Permission Checks (`permissions.ts`)

```typescript
function checkPermission(role, module, action): "ALLOW" | "REQUIRE_APPROVAL" | "DENY"
```

| Role | Result |
|---|---|
| SUPER_ADMIN | Always `ALLOW` |
| ADMIN | `REQUIRE_APPROVAL` for all write actions |
| USER | Always `DENY` for all write actions |

### Server Action Protection Pattern

Every server action follows this pattern:

```typescript
export async function createAsset(data) {
  // 1. Auth + tenant isolation
  const { userId, companyId, role } = await requireActiveCompany();

  // 2. Permission check
  const permission = checkPermission(role as Role, "ASSET", "CREATE");

  if (permission === "DENY") {
    throw new Error("You do not have permission");
  }

  if (permission === "REQUIRE_APPROVAL") {
    // Store request for approval
    await db.approvalRequest.create({ ... });
    return { requiresApproval: true };
  }

  // 3. Direct execution (SUPER_ADMIN)
  await db.asset.create({ ... });
}
```

---

## Public Route Security

### Acknowledgement Routes

The `/acknowledge/*` and `/api/acknowledge/*` routes are public (no authentication required):

**Security measures:**
1. **Token-based access:** Only accessible with a valid 64-char hex token
2. **Token hashing:** Raw tokens never stored — SHA-256 hash comparison only
3. **Token expiration:** Links expire after a configurable time
4. **One-time use:** Token hash is invalidated after successful submission
5. **Status validation:** Only PENDING acknowledgements can be submitted
6. **Input validation:** Signature data validated before processing
7. **No data leakage:** API only returns acknowledgement-specific data (asset details + assignee info)
8. **Audit logging:** Every submission logged with IP, browser, device

### What Public Routes Can Access

| Can Access | Cannot Access |
|---|---|
| Acknowledgement details for the specific token | User accounts |
| Company name and logo | Other assets |
| Asset name, code, tag, condition | Financial data |
| Assignee name, department | Admin panel |
| Assignment date | Other employees |

---

## Multi-Tenant Isolation

### How Tenant Isolation Works

```typescript
// src/lib/auth-utils.ts
export async function requireActiveCompany() {
  const session = await auth();

  if (!session?.user) throw new Error("Unauthorized");
  if (!user.activeCompanyId) throw new Error("No active company context");

  return {
    userId: user.id,
    companyId: user.activeCompanyId,  // ← All queries scoped to this
    role: user.role,
  };
}
```

Every server action and data query uses this `companyId` to scope data:

```typescript
const assets = await db.asset.findMany({
  where: { companyId },  // ← Tenant isolation
});
```

### Tenant Isolation Rules

- **All database queries** include `companyId` in WHERE clauses
- **SUPER_ADMIN** can switch between companies but still queries one company at a time
- **Company switcher** updates JWT via `unstable_update`, triggering re-render
- **No cross-company data leakage** — a user in Company A cannot see Company B's data

---

## Supabase Security

### Row-Level Security (RLS) Warnings

> **Current status:** RLS is NOT actively used for application data tables. The application connects to Supabase using the **service role key**, which **bypasses RLS entirely**.

This means:
- Supabase RLS policies on data tables have no effect on this application
- Security is enforced at the **application level** (middleware + server actions)
- If you add RLS policies, they will only affect direct Supabase client access (not the application)

### Supabase Dashboard Warnings

Supabase may show warnings like:
> "⚠️ RLS is not enabled for table X"

These warnings are expected and safe to ignore for this application because:
- The database is only accessed via the application's server-side code
- The application enforces its own tenant isolation
- The service role key is never exposed to the client

### If Adding RLS in Future

If you decide to add RLS policies:
1. Enable RLS on each table
2. Create policies that check `auth.uid()` or custom claims
3. Ensure the application still uses the service role key for server operations
4. Test thoroughly — incorrect policies can lock out the application

---

## Service Role Key Safety

### What the Service Role Key Can Do

The `SUPABASE_SERVICE_ROLE_KEY` has **FULL, UNRESTRICTED ACCESS** to your Supabase project:

- Read/write ANY table (bypasses RLS)
- Upload/delete ANY file in storage
- Manage users and auth
- Execute arbitrary SQL

### How It's Protected

1. **Server-side only:** Used exclusively in `src/lib/storage-service.ts`
2. **No NEXT_PUBLIC prefix:** Never exposed in client bundles
3. **Environment variable:** Stored in Vercel env vars, not in code
4. **Dynamic import:** Supabase client created lazily only when needed
5. **Not in Git:** `.env` and `.env.production` are in `.gitignore`

### What Happens If It Leaks

If the service role key is compromised:
1. **Rotate immediately** in Supabase Dashboard → Settings → API → Regenerate
2. **Update Vercel** env variable with new key
3. **Redeploy** the application
4. **Audit** storage buckets and database for unauthorized changes

---

## Backup/Restore Safety

### Backup Security

- Backup API is **SUPER_ADMIN only** (auth check in route handler)
- SQL dumps include all data (may contain PII)
- Backups should be stored securely and never committed to Git

### Restore Warnings

- **Never restore production backup to a shared/public database**
- **Never restore local test data to production**
- Backup files contain raw INSERT statements — review before running
- Use `ON CONFLICT DO NOTHING` to prevent duplicate key errors

---

## Security Checklist

### Environment
- [ ] `AUTH_SECRET` is a strong, unique random string in production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not in Git
- [ ] No `NEXT_PUBLIC_` prefix on sensitive variables
- [ ] `.env` and `.env.production` are in `.gitignore`

### Authentication
- [ ] All dashboard routes require login (middleware)
- [ ] Registration requires Super Admin approval
- [ ] Passwords hashed with bcrypt
- [ ] JWT sessions with secure secret

### Authorisation
- [ ] Role checks in middleware (route-level)
- [ ] Permission checks in server actions (operation-level)
- [ ] Tenant isolation via `requireActiveCompany()` (data-level)

### Public Routes
- [ ] Only `/acknowledge/*` routes are public
- [ ] Token-based access with hashing
- [ ] Tokens expire and are invalidated after use

### Storage
- [ ] Supabase buckets are PRIVATE
- [ ] Files accessed via signed URLs only
- [ ] Service role key used server-side only

### Data
- [ ] No raw SQL injection (Prisma parameterised queries)
- [ ] Input validation with Zod schemas
- [ ] Activity logging for audit trail
