# Asset Management System — Project Documentation

> Multi-company enterprise platform for managing assets, inventory, maintenance, transfers, and employee handovers with full approval workflows and digital acknowledgement receipts.

---

## 📋 What This App Does

This is a **multi-tenant asset management system** that allows organisations to:

- **Track physical assets** (laptops, furniture, equipment) across their full lifecycle
- **Manage inventory stock** with warehouse-style in/out tracking
- **Assign assets** to employees or departments with digital handover receipts
- **Transfer assets** between locations and employees with approval workflows
- **Maintain assets** via ticketing, scheduling, and vendor tracking
- **Export/backup data** as SQL dumps from local or production databases
- **Acknowledge asset receipt** via public token-based links with digital signatures

---

## 🏗️ Main Modules

| Module | Description |
|---|---|
| **Authentication** | NextAuth credentials-based login with JWT sessions |
| **Users & Roles** | SUPER_ADMIN, ADMIN, USER with company-scoped permissions |
| **Company** | Multi-tenant company management with company switching |
| **Employees** | Employee records linked to users, departments, locations |
| **Departments** | Organisational units for asset/employee grouping |
| **Locations** | Hierarchical physical locations with address details |
| **Asset Categories** | Classification system for assets and inventory items |
| **Assets** | Core asset CRUD with auto-generated codes and tags |
| **Asset Assignment** | Assign assets to employees/departments with handover details |
| **Asset Transfer** | Request → Approve → Complete transfer workflow |
| **Inventory** | Warehouse-style stock management with SKU/location balancing |
| **Inventory Assignment** | Issue inventory to employees, auto-register as individual assets |
| **Maintenance** | Tickets, schedules, vendors, and cost tracking |
| **Approval Workflow** | ADMINs submit requests, SUPER_ADMINs approve/reject |
| **Acknowledgement** | Public token-based digital signature + PDF receipt system |
| **Backup/Export** | SQL dump of local or production database |
| **Settings** | Company-level configuration (currency, codes, approvals) |

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| **SUPER_ADMIN** | Full access. Can approve/reject requests. Can manage all companies. Can access super-admin panel. |
| **ADMIN** | Can perform CRUD operations but all write actions are routed through the approval workflow. Can view own pending requests. |
| **USER** | Read-only access to assets and dashboard. Cannot access inventory, maintenance, transfers, settings, or approvals. |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| ORM | Prisma 7 with `@prisma/adapter-pg` driver adapter |
| Local Database | Docker PostgreSQL |
| Production Database | Supabase PostgreSQL (pooled + direct connections) |
| Auth | NextAuth v5 (Auth.js) with JWT strategy |
| UI Components | shadcn/ui + Radix UI + Tailwind CSS v4 |
| State Management | React Server Components + TanStack React Query |
| File Storage | Supabase Storage (production) / Local filesystem (development) |
| PDF Generation | pdf-lib |
| Hosting | Vercel |
| Charts | Recharts |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |

---

## 📚 Documentation Index

| Document | Description |
|---|---|
| [Architecture](./ARCHITECTURE.md) | High-level architecture, data flow, and folder structure |
| [Local Setup](./LOCAL_SETUP.md) | How to set up and run the project locally |
| [Production Setup](./PRODUCTION_SETUP.md) | Supabase, Vercel, and production deployment guide |
| [Database](./DATABASE.md) | Prisma models, enums, relations, and migration workflow |
| [Modules](./MODULES.md) | Detailed documentation for every application module |
| [Asset Acknowledgement](./ASSET_ACKNOWLEDGEMENT.md) | Token-based acknowledgement, signatures, and PDF receipts |
| [Environment Variables](./ENV_VARIABLES.md) | Complete reference for all environment variables |
| [Deployment Workflow](./DEPLOYMENT_WORKFLOW.md) | Git → Build → Deploy → Migrate pipeline |
| [Security](./SECURITY.md) | Auth protection, RBAC, public route security, secrets |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common errors and their fixes |
| [Developer Handover](./DEVELOPER_HANDOVER.md) | Onboarding guide for new developers |

---

## ⚡ Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd inventory-management

# 2. Install dependencies
npm install

# 3. Start Docker PostgreSQL
docker run --name inventory-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inventory_management -p 5432:5432 -d postgres:16

# 4. Set up environment
cp .env.example .env    # or create .env manually

# 5. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# 6. Seed sample data (optional)
npx prisma db seed

# 7. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

---

*For detailed setup instructions, see [Local Setup](./LOCAL_SETUP.md).*
