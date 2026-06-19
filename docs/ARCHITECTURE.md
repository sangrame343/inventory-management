# Architecture

## High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                         │
│   React 19 + Server Components + TanStack Query + shadcn/ui    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────┴───────────┐
                    │   Next.js 16 (Vercel)│
                    │     App Router       │
                    ├──────────────────────┤
                    │  Middleware (proxy.ts)│  ← Auth + RBAC gate
                    ├──────────────────────┤
                    │  Server Components   │  ← Data fetching (RSC)
                    │  Server Actions      │  ← Mutations
                    │  API Routes          │  ← REST endpoints
                    ├──────────────────────┤
                    │  Service Layer       │  ← Business logic
                    │  (approval-service,  │
                    │   dashboard-service, │
                    │   storage-service)   │
                    ├──────────────────────┤
                    │  Prisma ORM (v7)     │  ← Data access
                    │  + @prisma/adapter-pg│
                    └──────────┬───────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
    ┌─────────┴──────────┐          ┌───────────┴──────────┐
    │  LOCAL (Docker)     │          │  PRODUCTION          │
    │  PostgreSQL 16      │          │  Supabase PostgreSQL │
    │  localhost:5432      │          │  (Pooled + Direct)   │
    └────────────────────┘          └──────────────────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    │ Supabase Storage   │
                                    │ asset-signatures   │
                                    │ asset-receipts     │
                                    └───────────────────┘
```

---

## Request Flow

### Authenticated Dashboard Request

```
Browser → Middleware (proxy.ts)
  ├─ Is public route (/acknowledge, /api/acknowledge)? → Pass through
  ├─ Is auth route (/login, /register)? → Pass if unauthenticated
  ├─ Not logged in? → Redirect to /login
  ├─ Role-based route check:
  │   ├─ USER: Block inventory, maintenance, transfers, settings, super-admin
  │   ├─ ADMIN: Block super-admin, approvals
  │   └─ SUPER_ADMIN: Full access
  └─ Pass to Next.js App Router
       └─ Dashboard Layout (server component)
            ├─ Calls auth() to get session
            ├─ Fetches companies for current user
            ├─ Renders sidebar + header + company switcher
            └─ Renders page content (children)
```

### Write Operation Flow (ADMIN)

```
ADMIN clicks "Create Asset"
  → Server Action (asset-actions.ts)
    → checkPermission(role, module, action)
      → Returns "REQUIRE_APPROVAL"
        → Creates ApprovalRequest with payload
          → Activity log entry created
            → ADMIN sees request in "My Requests"

SUPER_ADMIN opens "Approvals"
  → Reviews pending request
    → Approves → ApprovalService handler executes stored payload
      → Asset created in database
        → Activity log updated
```

### Write Operation Flow (SUPER_ADMIN)

```
SUPER_ADMIN clicks "Create Asset"
  → Server Action (asset-actions.ts)
    → checkPermission(role, module, action)
      → Returns "ALLOW"
        → Directly creates asset in database
          → Activity log entry created
```

---

## Folder Structure

```
inventory-management/
├── prisma/
│   ├── schema.prisma          # Complete database schema
│   ├── seed.ts                # Database seeding script
│   ├── migrations/            # Migration history
│   └── ...
├── prisma.config.ts           # Prisma configuration (datasource, seed command)
├── src/
│   ├── auth.config.ts         # Edge-safe auth config (no DB dependencies)
│   ├── proxy.ts               # Middleware: auth + RBAC routing
│   ├── app/
│   │   ├── layout.tsx         # Root layout (providers, fonts, toaster)
│   │   ├── page.tsx           # Landing page (redirects to /dashboard)
│   │   ├── globals.css        # Global styles
│   │   ├── (auth)/
│   │   │   ├── login/         # Login page
│   │   │   └── register/      # Registration page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx     # Dashboard layout (sidebar, header, auth guard)
│   │   │   ├── dashboard/     # Dashboard analytics page
│   │   │   ├── assets/        # Asset CRUD pages
│   │   │   ├── employees/     # Employee management
│   │   │   ├── inventory/     # Inventory stock management
│   │   │   ├── maintenance/   # Maintenance tickets
│   │   │   ├── transfers/     # Asset transfer workflows
│   │   │   ├── locations/     # Location management
│   │   │   ├── approvals/     # SUPER_ADMIN approval queue
│   │   │   ├── my-requests/   # ADMIN pending requests
│   │   │   ├── acknowledgements/ # Acknowledgement management
│   │   │   ├── settings/      # Company settings
│   │   │   ├── super-admin/   # Super admin panel
│   │   │   └── profile/       # User profile
│   │   ├── acknowledge/       # Public acknowledgement pages
│   │   │   ├── [token]/       # Single asset acknowledgement
│   │   │   └── employee/[token]/ # Batch acknowledgement
│   │   ├── actions/           # Server Actions
│   │   │   ├── asset-actions.ts
│   │   │   ├── auth-actions.ts
│   │   │   ├── company-actions.ts
│   │   │   ├── employee-actions.ts
│   │   │   ├── inventory-item-actions.ts
│   │   │   ├── inventory-transaction-actions.ts
│   │   │   ├── import-assets-actions.ts
│   │   │   ├── import-employees-actions.ts
│   │   │   ├── import-inventory-actions.ts
│   │   │   ├── approval-actions.ts
│   │   │   ├── super-admin-actions.ts
│   │   │   └── profile-actions.ts
│   │   └── api/
│   │       ├── auth/[...nextauth]/ # NextAuth API handler
│   │       ├── acknowledge/       # Public acknowledge API
│   │       ├── backup/            # Database backup API
│   │       ├── assets/            # Asset API routes
│   │       ├── employees/         # Employee API routes
│   │       ├── departments/       # Department API routes
│   │       ├── locations/         # Location API routes
│   │       ├── maintenance/       # Maintenance API routes
│   │       ├── transfers/         # Transfer API routes
│   │       ├── settings/          # Settings API routes
│   │       ├── admin/             # Admin-only API routes
│   │       ├── cron/              # Scheduled tasks
│   │       └── scrape-image/      # Image utility
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── app-sidebar.tsx    # Main navigation sidebar
│   │   ├── company-switcher.tsx # Company context switcher
│   │   ├── login-form.tsx     # Login form component
│   │   ├── register-form.tsx  # Registration form component
│   │   ├── assets/            # Asset-specific components
│   │   ├── employees/         # Employee-specific components
│   │   ├── inventory/         # Inventory-specific components
│   │   ├── maintenance/       # Maintenance-specific components
│   │   ├── transfers/         # Transfer-specific components
│   │   ├── locations/         # Location-specific components
│   │   ├── approvals/         # Approval-specific components
│   │   ├── dashboard/         # Dashboard analytics components
│   │   ├── settings/          # Settings components
│   │   ├── profile/           # Profile components
│   │   └── providers/         # Context providers
│   ├── lib/
│   │   ├── auth.ts            # NextAuth full configuration
│   │   ├── auth-utils.ts      # requireActiveCompany helper
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── prisma.ts          # Alternative Prisma export
│   │   ├── permissions.ts     # Role-based permission checker
│   │   ├── crypto-utils.ts    # Token generation & hashing
│   │   ├── storage-service.ts # Supabase/local file storage
│   │   ├── asset-utils.ts     # Asset code/tag generation
│   │   ├── utils.ts           # General utilities (cn)
│   │   ├── services/
│   │   │   ├── approval-service.ts  # Full approval execution engine
│   │   │   └── dashboard-service.ts # Dashboard analytics queries
│   │   ├── utils/             # Additional utility modules
│   │   └── validations/       # Zod validation schemas
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Service layer
│   └── types/                 # TypeScript type definitions
├── scripts/
│   ├── backfill-employees.ts  # Data migration scripts
│   └── link-superadmin-to-companies.ts
├── public/                    # Static assets
├── docs/                      # This documentation
├── package.json
├── next.config.ts
├── tsconfig.json
└── .env / .env.production
```

---

## Multi-Tenancy Model

The application uses a **company-scoped** multi-tenancy model:

- Every data record belongs to a `companyId`
- The user's `activeCompanyId` (stored in JWT) determines the tenant context
- `requireActiveCompany()` helper enforces tenant isolation in every server action
- SUPER_ADMIN users can switch between all companies
- Regular users only see companies they belong to via `CompanyUser`

```
User ──1:N──▶ CompanyUser ──N:1──▶ Company
                 │
                 └── role: SUPER_ADMIN | ADMIN | USER
```

---

## Data Flow Patterns

### 1. Server Components (Read Operations)
Pages under `(dashboard)/` are server components that:
- Call `auth()` to get the current session
- Query the database directly via Prisma
- Pass data as props to client components

### 2. Server Actions (Write Operations)
Files in `src/app/actions/` handle mutations:
- Call `requireActiveCompany()` for auth + tenant isolation
- Call `checkPermission()` to determine if direct execution or approval is needed
- Either execute directly (SUPER_ADMIN) or create an `ApprovalRequest` (ADMIN)

### 3. API Routes (External-facing)
Files in `src/app/api/` handle:
- NextAuth endpoints (`/api/auth/[...nextauth]`)
- Public acknowledgement APIs (`/api/acknowledge/[token]`)
- Database backup API (`/api/backup`)
- CRUD REST endpoints for client-side fetching

### 4. Client-Side Data Fetching
TanStack React Query is used for:
- Real-time data refetching after mutations
- Optimistic updates
- Cache invalidation
