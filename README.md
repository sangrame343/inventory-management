# Asset Management System

> Multi-company enterprise platform for managing assets, inventory, maintenance, transfers, and employee handovers — built with Next.js 16, Prisma, and Supabase.

## What This App Does

- **Track assets** across their full lifecycle (create → assign → transfer → maintain → dispose)
- **Manage inventory stock** with warehouse-style quantity tracking per location
- **Assign assets** to employees or departments with digital handover receipts
- **Transfer assets** between locations/employees with multi-step approval workflows
- **Maintain assets** via ticketing, scheduling, and cost tracking
- **Approve operations** — ADMINs submit requests, SUPER_ADMINs approve or reject
- **Acknowledge receipts** — public token-based links with digital signature + PDF generation
- **Backup data** — SQL export of local or production databases

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| ORM | Prisma 7 |
| Database | PostgreSQL (Docker locally, Supabase in production) |
| Auth | NextAuth v5 (Auth.js) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Storage | Supabase Storage (production) / Local filesystem (dev) |
| Hosting | Vercel |

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd inventory-management
npm install

# Start Docker PostgreSQL
docker run --name inventory-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inventory_management -p 5432:5432 -d postgres:16

# Set up environment
# Create .env with DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_URL (see docs/LOCAL_SETUP.md)

# Run migrations and start
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 📚 Documentation

| Document | Description |
|---|---|
| [📋 Project Overview](./docs/README.md) | Full project overview, modules, and tech stack |
| [🏗️ Architecture](./docs/ARCHITECTURE.md) | System design, folder structure, data flow patterns |
| [💻 Local Setup](./docs/LOCAL_SETUP.md) | Docker PostgreSQL, environment, install, and run |
| [🚀 Production Setup](./docs/PRODUCTION_SETUP.md) | Supabase, Vercel, storage buckets, first deploy |
| [🗄️ Database](./docs/DATABASE.md) | All Prisma models, enums, relations, migration workflow |
| [📦 Modules](./docs/MODULES.md) | Detailed docs for all 18 modules |
| [✍️ Acknowledgement System](./docs/ASSET_ACKNOWLEDGEMENT.md) | Token security, signatures, PDF generation |
| [🔑 Environment Variables](./docs/ENV_VARIABLES.md) | Complete env reference with security rules |
| [📤 Deployment Workflow](./docs/DEPLOYMENT_WORKFLOW.md) | Git → Build → Deploy → Migrate pipeline |
| [🔒 Security](./docs/SECURITY.md) | Auth, RBAC, public routes, Supabase RLS, secrets |
| [🔧 Troubleshooting](./docs/TROUBLESHOOTING.md) | Common errors and fixes |
| [🤝 Developer Handover](./docs/DEVELOPER_HANDOVER.md) | Onboarding guide for new developers |

## User Roles

| Role | Access |
|---|---|
| **SUPER_ADMIN** | Full access, approve/reject requests, manage all companies |
| **ADMIN** | CRUD with approval workflow, view own requests |
| **USER** | Read-only access to assets and dashboard |
