# Developer Handover Guide

## Welcome, New Developer! 👋

This guide will get you up to speed with the Asset Management System. Follow these steps in order.

---

## Step 1: Read These Files First

Read in this order for the fastest understanding:

| Priority | File | What You'll Learn |
|---|---|---|
| 1 | [`docs/README.md`](./README.md) | What the app does, modules, tech stack |
| 2 | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) | System design, folder structure, data flow |
| 3 | [`docs/LOCAL_SETUP.md`](./LOCAL_SETUP.md) | How to get it running locally |
| 4 | [`prisma/schema.prisma`](../prisma/schema.prisma) | Database models and relationships |
| 5 | [`src/proxy.ts`](../src/proxy.ts) | Middleware — auth and role protection |
| 6 | [`src/lib/permissions.ts`](../src/lib/permissions.ts) | Permission model (ALLOW/REQUIRE_APPROVAL/DENY) |
| 7 | [`src/lib/auth-utils.ts`](../src/lib/auth-utils.ts) | Tenant isolation pattern |
| 8 | [`docs/MODULES.md`](./MODULES.md) | All module details (read modules you'll work on) |

---

## Step 2: Set Up Your Environment

Follow [LOCAL_SETUP.md](./LOCAL_SETUP.md) to:

1. Install Docker, Node.js, and npm
2. Start a local PostgreSQL container
3. Create your `.env` file
4. Install dependencies
5. Run migrations and (optionally) seed data
6. Start the dev server

**Time estimate:** 15-20 minutes

---

## Step 3: Explore the Application

Once running at `http://localhost:3000`:

1. **Register** a new account
2. If seeded, login as the super admin and **approve your registration**
3. **Create a company** (if none exists)
4. **Navigate each module** to understand the UI:
   - Dashboard → Assets → Employees → Inventory
   - Try creating, editing, deleting records
   - Switch between SUPER_ADMIN and ADMIN roles to see the approval workflow
5. **Test an acknowledgement:** Assign an asset, generate an acknowledgement link, open it in another browser

---

## Step 4: Understand the Code Patterns

### Pattern 1: Server Action (The Most Common Pattern)

```typescript
// src/app/actions/asset-actions.ts

"use server";

export async function createAsset(data: AssetInput) {
  // 1. Auth + tenant isolation (ALWAYS first)
  const { userId, companyId, role } = await requireActiveCompany();

  // 2. Permission check (ALLOW / REQUIRE_APPROVAL / DENY)
  const permission = checkPermission(role as Role, "ASSET", "CREATE");

  if (permission === "DENY") {
    return { success: false, error: "Permission denied" };
  }

  if (permission === "REQUIRE_APPROVAL") {
    // Store the request payload for later execution
    await db.approvalRequest.create({
      data: {
        companyId,
        requestedById: userId,
        module: "ASSET",
        action: "CREATE",
        title: "Create Asset: " + data.name,
        payload: data,
      },
    });
    return { success: true, requiresApproval: true };
  }

  // 3. Direct execution (SUPER_ADMIN only reaches here)
  const asset = await db.asset.create({
    data: { ...data, companyId },
  });

  // 4. Revalidate cache
  revalidatePath("/assets");

  return { success: true, asset };
}
```

### Pattern 2: API Route

```typescript
// src/app/api/assets/route.ts

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.activeCompanyId;
  const assets = await db.asset.findMany({
    where: { companyId },
  });

  return NextResponse.json(assets);
}
```

### Pattern 3: Server Component Page

```typescript
// src/app/(dashboard)/assets/page.tsx

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user?.activeCompanyId) redirect("/login");

  const assets = await db.asset.findMany({
    where: { companyId: session.user.activeCompanyId },
    include: { category: true, department: true },
  });

  return <AssetListClient assets={assets} />;
}
```

---

## How to Add a New Feature

### Example: Adding a "Notes" Feature to Assets

#### 1. Schema Change (If Needed)

```prisma
// prisma/schema.prisma
model Asset {
  // ... existing fields
  internalNotes  String?  // ← Add new field
}
```

```bash
npx prisma migrate dev --name add_internal_notes_to_asset
```

#### 2. Update Server Action

```typescript
// src/app/actions/asset-actions.ts
// Add the new field to the create/update functions
```

#### 3. Update UI Components

```typescript
// src/components/assets/asset-form.tsx
// Add a new text input for "internalNotes"
```

#### 4. Update Approval Handler (If Applicable)

```typescript
// src/lib/services/approval-service.ts
// If the field is part of a payload that goes through approval,
// make sure the handler passes it through
```

#### 5. Test

- Test with SUPER_ADMIN (direct execution)
- Test with ADMIN (approval workflow)
- Test create, update, and display

#### 6. Deploy

```bash
git add .
git commit -m "feat: add internal notes field to assets"
git push origin main
# Then: npx prisma migrate deploy (for production)
```

---

## How to Add a New Database Field Safely

### Step-by-Step

1. **Add the field to `schema.prisma`**
   ```prisma
   model Asset {
     newField String? // Always make new fields optional (nullable)
   }
   ```

   > **Important:** New fields should be **optional** (`?`) or have a `@default()` value. This ensures existing records don't break.

2. **Create migration locally**
   ```bash
   npx prisma migrate dev --name add_new_field_to_asset
   ```

3. **Test locally** — verify existing features still work

4. **Update application code** to use the new field

5. **Commit everything** (migration file + code changes)
   ```bash
   git add .
   git commit -m "feat: add newField to Asset"
   git push origin main
   ```

6. **Apply migration to production**
   ```bash
   npx prisma migrate deploy
   ```

### What NOT to Do

| ❌ Don't | ✅ Do Instead |
|---|---|
| Make new fields required without a default | Use `String?` or `@default("")` |
| Run `prisma db push` on production | Use `prisma migrate deploy` |
| Edit existing migration files | Create a new migration |
| Add `NOT NULL` to existing columns with data | Make it optional, then backfill, then make required in a later migration |

---

## How to Test Before Deployment

### 1. Local Testing

```bash
# Run the build (catches TypeScript errors)
npm run build

# Run ESLint
npm run lint
```

### 2. Test with Different Roles

Login as different users to test:
- **SUPER_ADMIN:** Can perform all actions directly
- **ADMIN:** All writes go through approval
- **USER:** Can only view assets and dashboard

### 3. Test Edge Cases

- Empty states (no data)
- Long text values
- Special characters in names
- Network errors (stop Docker to test DB failures)
- Multiple browser tabs (concurrent access)

### 4. Test Approval Flow

1. Login as ADMIN → perform a write action
2. Login as SUPER_ADMIN → check approval queue → approve/reject
3. Verify the action was executed or rejected correctly

---

## Key Files Reference

### Must-Know Files

| File | Why It's Important |
|---|---|
| `prisma/schema.prisma` | All database models — the single source of truth |
| `src/proxy.ts` | Route protection — controls who can access what |
| `src/lib/auth.ts` | Auth configuration — JWT claims, session callbacks |
| `src/lib/auth-utils.ts` | `requireActiveCompany()` — used in EVERY server action |
| `src/lib/permissions.ts` | `checkPermission()` — the RBAC engine |
| `src/lib/services/approval-service.ts` | Approval execution — handlers for all module+action combos |
| `src/lib/storage-service.ts` | File upload — Supabase or local fallback |
| `src/lib/crypto-utils.ts` | Token generation and hashing for acknowledgements |
| `src/lib/asset-utils.ts` | Asset code/tag generation logic |

### Configuration Files

| File | Purpose |
|---|---|
| `package.json` | Dependencies and scripts |
| `prisma.config.ts` | Prisma datasource and seed configuration |
| `next.config.ts` | Next.js configuration |
| `tsconfig.json` | TypeScript configuration |
| `components.json` | shadcn/ui component configuration |

---

## Getting Help

- **Architecture questions:** Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Module-specific questions:** Read [MODULES.md](./MODULES.md)
- **Database questions:** Read [DATABASE.md](./DATABASE.md)
- **Deployment issues:** Read [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md)
- **Common errors:** Read [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Security concerns:** Read [SECURITY.md](./SECURITY.md)
- **Environment setup:** Read [ENV_VARIABLES.md](./ENV_VARIABLES.md)
