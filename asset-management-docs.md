# Asset Management Portal — Complete Documentation

> **ABPL / IBA** · Built with Next.js 16, React 19, Prisma 7, PostgreSQL

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [User Roles](#5-user-roles)
6. [Database Schema](#6-database-schema)
7. [Modules](#7-modules)
   - 7.1 [Dashboard](#71-dashboard)
   - 7.2 [Assets](#72-assets)
   - 7.3 [Inventory](#73-inventory)
   - 7.4 [Maintenance](#74-maintenance)
   - 7.5 [Employees](#75-employees)
   - 7.6 [Transfers](#76-transfers)
   - 7.7 [Locations](#77-locations)
   - 7.8 [Settings](#78-settings)
   - 7.9 [Super Admin](#79-super-admin)
8. [API Reference](#8-api-reference)
9. [Key Components](#9-key-components)
10. [Setup & Running Locally](#10-setup--running-locally)
11. [Environment Variables](#11-environment-variables)

---

## 1. Project Overview

The **Asset Management Portal** is a multi-tenant, role-based web application for managing physical assets, inventory, maintenance, employees, and asset transfers within an organisation. Each company (tenant) has isolated data, and users can belong to multiple companies with different roles in each.

### Core Capabilities

| Capability                  | Description                                                                |
| --------------------------- | -------------------------------------------------------------------------- |
| **Asset Lifecycle**         | Register, assign, transfer, retire, and dispose of physical assets         |
| **Inventory Management**    | Track consumables, spare parts, and tools with stock movements             |
| **Maintenance**             | Log tickets, assign technicians, schedule preventive maintenance           |
| **Employee Management**     | Maintain employee records, link to user accounts, track assignments        |
| **Transfer Management**     | Request, approve, and complete asset transfers between locations/employees |
| **Multi-tenancy**           | Full data isolation per company; company switcher in UI                    |
| **Admin Approval Workflow** | New user registrations require SUPER_ADMIN approval                        |
| **Bulk Import**             | Excel-based import for assets, employees, and inventory items              |

---

## 2. Tech Stack

| Layer                | Technology            | Version                 |
| -------------------- | --------------------- | ----------------------- |
| **Framework**        | Next.js               | 16.2.1                  |
| **Runtime**          | React                 | 19.2.4                  |
| **Language**         | TypeScript            | ^5                      |
| **Database**         | PostgreSQL            | (via Docker or managed) |
| **ORM**              | Prisma                | ^7.6.0                  |
| **Authentication**   | NextAuth v5 (beta)    | ^5.0.0-beta.30          |
| **UI Components**    | shadcn/ui + Radix UI  | —                       |
| **Styling**          | Tailwind CSS          | ^4                      |
| **Forms**            | React Hook Form + Zod | ^7 / ^4                 |
| **State / Fetching** | TanStack React Query  | ^5                      |
| **Charts**           | Recharts              | ^3                      |
| **Excel I/O**        | xlsx                  | ^0.18.5                 |
| **Notifications**    | Sonner (toasts)       | ^2                      |
| **Icons**            | Lucide React          | ^1                      |
| **Date Utils**       | date-fns              | ^4                      |
| **Password Hashing** | bcryptjs              | ^3                      |

---

## 3. Architecture

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth routes (login, register)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/            # Protected dashboard routes
│   │   ├── layout.tsx          # Auth check + sidebar + header
│   │   ├── dashboard/
│   │   ├── assets/
│   │   ├── inventory/
│   │   ├── maintenance/
│   │   ├── employees/
│   │   ├── transfers/
│   │   ├── locations/
│   │   ├── settings/
│   │   └── super-admin/        # SUPER_ADMIN only
│   ├── api/                    # Next.js Route Handlers (REST API)
│   │   ├── assets/
│   │   ├── auth/
│   │   ├── departments/
│   │   ├── employees/
│   │   ├── locations/
│   │   ├── maintenance/
│   │   ├── settings/
│   │   └── transfers/
│   ├── actions/                # Server Actions
│   ├── globals.css
│   └── layout.tsx              # Root layout (theme provider, fonts)
│
├── components/                 # React components (by feature)
│   ├── assets/
│   ├── dashboard/
│   ├── employees/
│   ├── inventory/
│   ├── locations/
│   ├── maintenance/
│   ├── settings/
│   ├── transfers/
│   ├── ui/                     # shadcn/ui primitives
│   ├── app-sidebar.tsx
│   ├── company-switcher.tsx
│   ├── login-form.tsx
│   └── register-form.tsx
│
├── services/                   # Business-logic service layer
│   ├── assignment-service.ts
│   ├── employee-service.ts
│   ├── location-service.ts
│   ├── maintenance-service.ts
│   ├── settings-service.ts
│   └── transfer-service.ts
│
├── lib/                        # Shared utilities
│   ├── auth.ts                 # NextAuth instance
│   └── db.ts                   # Prisma client singleton
│
├── hooks/                      # Custom React hooks
├── types/                      # TypeScript type definitions
├── auth.config.ts              # NextAuth JWT / session config
└── middleware.ts               # Route protection
```

### Request Flow

```
Browser → middleware.ts (auth guard)
         → Next.js App Router
           ├── Server Component (fetch via Prisma directly or service layer)
           └── Client Component → fetch /api/* → Route Handler → Prisma → PostgreSQL
```

---

## 4. Authentication & Authorization

### Authentication Method

- **Provider**: Email + Password credentials (NextAuth v5 Credentials provider)
- **Session Strategy**: JWT (stateless)
- **Password Storage**: bcryptjs hash stored in `User.passwordHash`

### JWT Token Payload

After login the JWT token carries:
| Field | Description |
|---|---|
| `id` | User's database ID |
| `activeCompanyId` | Currently active company |
| `isSuperAdmin` | Boolean flag for super-admin bypass |
| `companyIds` | Array of all company IDs the user belongs to |
| `role` | Role in the active company |

### Middleware (Route Protection)

`src/middleware.ts` runs on every page request (excluding `api`, `_next/static`, `_next/image`, `favicon.ico`):

```
/ (root)           → redirects to /dashboard
/login, /register  → allowed only when NOT logged in
Any other route    → requires active session; unauthenticated → /login
/super-admin/*     → additionally requires isSuperAdmin === true
```

### Registration Workflow

1. User fills the registration form (`/register`) with name, email, password, mobile, requested role, and company.
2. Account is created with `status: PENDING`.
3. SUPER_ADMIN reviews the request at `/super-admin/registrations`.
4. SUPER_ADMIN can **Approve** (sets `status: ACTIVE`, creates `CompanyUser` record) or **Reject** (sets `status: REJECTED` with optional remarks).
5. Only `ACTIVE` users can log in.

---

## 5. User Roles

Roles are defined in the `Role` enum and are scoped per company:

| Role                  | Typical Access                                                    |
| --------------------- | ----------------------------------------------------------------- |
| `SUPER_ADMIN`         | Full access across all companies; manages registrations and users |
| `COMPANY_ADMIN`       | Full access within their company                                  |
| `ASSET_MANAGER`       | Manage assets, assignments, and transfers                         |
| `INVENTORY_MANAGER`   | Manage inventory items, stock, and adjustments                    |
| `MAINTENANCE_MANAGER` | Manage maintenance tickets and schedules                          |
| `TECHNICIAN`          | View and update assigned maintenance tickets                      |
| `EMPLOYEE`            | View own assigned assets                                          |
| `AUDITOR`             | Read-only access for auditing purposes                            |
| `FINANCE_VIEWER`      | Read-only access to cost and financial data                       |

A user can have **different roles in different companies**. The `CompanyUser` join table stores this mapping.

---

## 6. Database Schema

The application uses **PostgreSQL** via **Prisma ORM**. All data is fully tenant-isolated by `companyId`.

### Core Entity Diagram

```
Company
  ├── CompanyUser (many users, with Role)
  ├── CompanySettings
  ├── Department
  ├── Location (hierarchical, self-referential)
  ├── AssetCategory
  ├── Vendor
  ├── Asset
  │     ├── AssetAssignment (handovers to Employee/Location)
  │     ├── AssetTransfer
  │     ├── MaintenanceTicket
  │     └── MaintenanceSchedule
  ├── Employee (optionally linked to User)
  ├── InventoryCategory
  ├── UnitOfMeasure
  ├── InventoryLocation
  ├── InventoryItem
  │     ├── InventoryTransaction
  │     ├── InventoryBalance
  │     └── InventoryAdjustment
  └── ActivityLog
```

### Key Models

#### `User`

| Field                | Type         | Notes                              |
| -------------------- | ------------ | ---------------------------------- |
| `id`                 | String       | CUID primary key                   |
| `name`               | String?      | Display name                       |
| `email`              | String?      | Unique                             |
| `passwordHash`       | String?      | bcrypt hash                        |
| `status`             | `UserStatus` | PENDING / ACTIVE / REJECTED        |
| `isSuperAdmin`       | Boolean      | System-level bypass flag           |
| `requestedRole`      | `Role`?      | Role requested at registration     |
| `requestedCompanyId` | String?      | Company requested at registration  |
| `rejectionRemarks`   | String?      | Filled by SUPER_ADMIN on rejection |
| `activeCompanyId`    | String?      | Currently selected company         |

#### `Asset`

| Field                | Type          | Notes                                        |
| -------------------- | ------------- | -------------------------------------------- |
| `name`               | String        | Asset name                                   |
| `assetCode`          | String?       | Auto-generated code (e.g. prefix + sequence) |
| `assetTag`           | String        | Physical tag/barcode                         |
| `serialNumber`       | String?       | Manufacturer serial                          |
| `brand` / `model`    | String?       | Hardware details                             |
| `status`             | `AssetStatus` | ACTIVE / ASSIGNED / REPAIR / DISPOSED / LOST |
| `purchaseDate`       | DateTime?     | Date of acquisition                          |
| `cost`               | Float?        | Purchase cost                                |
| `usefulLife`         | Int?          | In months/years                              |
| `warrantyExpiration` | DateTime?     | Warranty end date                            |
| `categoryId`         | String        | FK to `AssetCategory`                        |
| `departmentId`       | String?       | FK to `Department`                           |
| `locationId`         | String?       | FK to `Location`                             |
| `vendorId`           | String?       | FK to `Vendor`                               |

#### `AssetAssignment` (Handover)

Tracks every assignment event for an asset.

| Field                   | Type                | Notes                                   |
| ----------------------- | ------------------- | --------------------------------------- |
| `transactionId`         | String              | Unique per handover                     |
| `handoverType`          | `HandoverType`      | NEW_HIRE / REPLACEMENT / TEMPORARY_LOAN |
| `physicalCondition`     | `PhysicalCondition` | BRAND_NEW / USED_EXCELLENT / USED_FAIR  |
| `functionalStatus`      | `FunctionalStatus`  | WORKING / MINOR_ISSUES                  |
| `handoverDate`          | DateTime?           | Formal handover date                    |
| `returnedAt`            | DateTime?           | Set when asset is returned              |
| `employeeSignatureName` | String?             | Captured at handover                    |
| `issuingOfficerName`    | String?             | Person issuing the asset                |
| `termsAccepted`         | Boolean             | Employee acknowledged terms             |

#### `InventoryItem`

Consumables, spares, and tools tracked by stock level.

| Field             | Type                | Notes                             |
| ----------------- | ------------------- | --------------------------------- |
| `sku`             | String              | Unique per company                |
| `itemType`        | `InventoryItemType` | CONSUMABLE / SPARE / TOOL / OTHER |
| `minStockLevel`   | Int                 | Triggers low-stock alert          |
| `reorderLevel`    | Int                 | Reorder trigger point             |
| `isSerialTracked` | Boolean             | Serial number tracking            |
| `isBatchTracked`  | Boolean             | Batch/lot tracking                |

#### `InventoryTransaction`

Immutable ledger of all stock movements.

| Field          | Type                | Notes                             |
| -------------- | ------------------- | --------------------------------- |
| `direction`    | `MovementDirection` | IN / OUT                          |
| `movementType` | `MovementType`      | See enum below                    |
| `quantity`     | Int                 | Units moved                       |
| `unitCost`     | Float?              | Cost per unit at time of movement |
| `balanceAfter` | Int?                | Running balance snapshot          |

**Movement Types**: OPENING_STOCK, PURCHASE_RECEIPT, MANUAL_STOCK_IN/OUT, ISSUE_TO_EMPLOYEE, ISSUE_TO_ASSET, RETURN_IN, TRANSFER_IN/OUT, ADJUSTMENT_IN/OUT, DAMAGED_OUT, SCRAP_OUT

#### `AssetTransfer`

Tracks movement of assets between locations or employees.

| Field                   | Type             | Notes                                              |
| ----------------------- | ---------------- | -------------------------------------------------- |
| `transferCode`          | String?          | Auto-generated (e.g. TRF-001)                      |
| `transferType`          | `TransferType`   | LOCATION_TO_LOCATION / EMPLOYEE_TO_EMPLOYEE / etc. |
| `status`                | `TransferStatus` | REQUESTED → APPROVED → IN_TRANSIT → COMPLETED      |
| `conditionBefore/After` | String?          | Asset condition notes                              |
| `plannedTransferDate`   | DateTime?        | Planned movement date                              |

---

## 7. Modules

### 7.1 Dashboard

**Route**: `/dashboard`

Provides an overview of the company's asset and operational health.

**Widgets:**

- **Stat Cards** — Total Assets, Active Assets, Assets Under Maintenance, Total Employees
- **Dashboard Charts** — Asset status distribution (pie/bar via Recharts)
- **Maintenance Urgency** — Upcoming or overdue maintenance schedules
- **Activity Feed** — Recent `ActivityLog` entries for the company
- **Quick Actions** — Shortcut buttons to common tasks (Add Asset, New Ticket, etc.)

**Components**: `stat-card.tsx`, `dashboard-charts.tsx`, `dashboard-grid.tsx`, `maintenance-urgency.tsx`, `activity-feed.tsx`, `quick-actions.tsx`

---

### 7.2 Assets

**Routes**: `/assets`, `/assets/[id]`

The central module for managing physical assets throughout their lifecycle.

#### Asset Registry (`/assets`)

**Features:**

- Searchable, filterable, sortable data table of all company assets
- **Filters**: Status, Category, Location, Vendor
- **Sort options**: Name, Purchase Date, Cost, Status
- **Columns**: Asset Tag, Name, Category, Status, Location, Department, Purchase Date, Cost
- Long asset names are truncated with ellipsis for clean layout

#### Asset Detail (`/assets/[id]`)

Shows full details for a single asset including:

- All metadata (brand, model, serial, warranty)
- Assignment history
- Maintenance ticket history
- Transfer history

#### Key Actions

| Action             | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| **Add Asset**      | Modal form with full metadata, financial, and warranty details       |
| **Edit Asset**     | Inline form for updating asset fields                                |
| **Assign Asset**   | Handover modal: selects employee, location, handover type, condition |
| **Return Asset**   | Captures return condition, reason, and clearance status              |
| **Bulk Import**    | Upload Excel file with all asset fields + initial assignment         |
| **Transfer Asset** | Initiates a transfer request (see Transfers module)                  |

#### Asset Statuses

`ACTIVE` → `ASSIGNED` → `REPAIR` → `DISPOSED` / `LOST`

**Components**: `add-asset-modal.tsx`, `edit-asset-form.tsx`, `asset-assign-modal.tsx`, `asset-return-modal.tsx`, `asset-table-client.tsx`, `asset-table-toolbar.tsx`, `asset-import-button.tsx`, `transfer-history.tsx`

---

### 7.3 Inventory

**Route**: `/inventory`

Tracks consumable items, spare parts, and tools by quantity at various inventory locations.

#### Features

| Feature               | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| **Item Catalogue**    | List of all inventory items with SKU, type, category, unit         |
| **Stock Dashboard**   | Summary cards: Total Items, Low Stock count, Total Transactions    |
| **Stock Movements**   | Record IN/OUT movements (purchase receipts, issues, returns, etc.) |
| **Stock Adjustments** | Correct discrepancies between system and physical count            |
| **Bulk Import**       | Excel import for inventory items                                   |

#### Stock Balance

The `InventoryBalance` model maintains a real-time per-item, per-location balance:

- `quantityOnHand` — Physical units present
- `reservedQty` — Reserved but not yet issued
- `availableQty` — quantityOnHand - reservedQty

#### Movement Types (grouped)

- **Inbound**: OPENING_STOCK, PURCHASE_RECEIPT, MANUAL_STOCK_IN, RETURN_IN, TRANSFER_IN, ADJUSTMENT_IN
- **Outbound**: MANUAL_STOCK_OUT, ISSUE_TO_EMPLOYEE, ISSUE_TO_ASSET, TRANSFER_OUT, ADJUSTMENT_OUT, DAMAGED_OUT, SCRAP_OUT

**Components**: `inventory-dashboard.tsx`, `inventory-table.tsx`, `add-item-modal.tsx`, `stock-movement-modal.tsx`, `stock-adjustment-modal.tsx`, `inventory-import-button.tsx`

---

### 7.4 Maintenance

**Route**: `/maintenance`

Manages corrective and preventive maintenance for assets.

#### Maintenance Tickets

| Field    | Values                                                                       |
| -------- | ---------------------------------------------------------------------------- |
| Priority | LOW / MEDIUM / HIGH / CRITICAL                                               |
| Status   | OPEN → IN_PROGRESS → ON_HOLD / PENDING_PARTS → RESOLVED → CLOSED / CANCELLED |
| Type     | CORRECTIVE / PREVENTIVE / UPGRADE / OTHER                                    |

Each ticket records:

- Asset under maintenance
- Assigned technician
- Vendor (if outsourced)
- Scheduled, started, resolved, and completed timestamps
- Cost breakdown: `estimatedCost`, `laborCost`, `partsCost`, `cost`
- `downtimeHours` — operational impact
- `resolutionNotes` — detailed repair notes

#### Maintenance Schedules

Recurring maintenance plans linked to an asset:

- `frequencyDays` — interval (e.g. 90 days)
- `lastMaintenanceDate` / `nextDueDate` — auto-calculated
- `isActive` flag — enable/disable schedule

**Generate Tickets** button creates maintenance tickets for all schedules due within the configured reminder window (`CompanySettings.maintenanceReminderDays`, default: 7 days).

**Components**: `ticket-list.tsx`, `maintenance-form.tsx`, `schedule-list.tsx`, `schedule-form.tsx`, `generate-tickets-button.tsx`

---

### 7.5 Employees

**Route**: `/employees`

Central record of all employees within the company.

#### Employee Fields

| Field                      | Notes                                     |
| -------------------------- | ----------------------------------------- |
| `employeeCode`             | Unique identifier per company             |
| `fullName`                 | Full legal name                           |
| `email` / `phone`          | Contact information                       |
| `designation`              | Job title                                 |
| `departmentId`             | FK to Department                          |
| `locationId`               | FK to Location                            |
| `status`                   | ACTIVE / INACTIVE / RESIGNED / TERMINATED |
| `joiningDate` / `exitDate` | Employment period                         |
| `userId`                   | Optional link to a User account           |

#### Features

- **Searchable list** with filters by department, location, status
- **Sort dropdown** for flexible data ordering
- **Employee Details Sheet** — slide-in panel showing full profile + assigned assets
- **Add/Edit Employee** — full-featured form
- **Bulk Import** — Excel import for creating multiple employees
- **Link to User** — associate an employee record with a system user account

**Components**: `employee-list.tsx`, `employee-form.tsx`, `employee-details-sheet.tsx`, `employee-import-button.tsx`

---

### 7.6 Transfers

**Route**: `/transfers`

Manages the movement of assets between locations or employees.

#### Transfer Workflow

```
REQUESTED → APPROVED → IN_TRANSIT → COMPLETED
                          ↓
                       REJECTED / CANCELLED
```

> If `CompanySettings.requireTransferApproval = true`, transfers must go through the approval step (default: enabled).

#### Transfer Types

| Type                   | Meaning                               |
| ---------------------- | ------------------------------------- |
| `LOCATION_TO_LOCATION` | Move asset between physical locations |
| `EMPLOYEE_TO_EMPLOYEE` | Re-assign between employees           |
| `EMPLOYEE_TO_LOCATION` | Return employee asset to a location   |
| `LOCATION_TO_EMPLOYEE` | Issue from location to employee       |

#### Transfer Details

- Auto-generated `transferCode` (sequential per company, e.g. `TRF-001`)
- Condition notes before and after transport
- Planned and actual dispatch/receipt dates
- Full audit trail: requestedBy, approvedBy, completedBy

**Components**: `add-transfer-modal.tsx`, `transfer-actions.tsx`

---

### 7.7 Locations

**Route**: `/locations`

Manages physical locations where assets and employees are situated.

#### Features

- **Hierarchical Locations** — parent/child tree (e.g. Building → Floor → Room)
- Full address fields: `addressLine1`, `city`, `state`, `country`, `postalCode`
- `code` — short identifier for quick reference
- `isActive` flag to deactivate without deletion

**Components**: `src/components/locations/`

---

### 7.8 Settings

**Route**: `/settings`

Company-level configuration and master data management.

#### General Settings (`CompanySettings`)

| Setting                      | Default      | Description                                     |
| ---------------------------- | ------------ | ----------------------------------------------- |
| `assetCodePrefix`            | —            | Prefix for auto-generated asset codes           |
| `autoGenerateAssetCode`      | `true`       | Auto-increment asset code                       |
| `currency`                   | `INR`        | Currency for cost fields                        |
| `dateFormat`                 | `DD-MM-YYYY` | Display date format                             |
| `maintenanceReminderDays`    | `7`          | Days in advance to generate maintenance tickets |
| `requireTransferApproval`    | `true`       | Mandate approval step for transfers             |
| `requireMaintenanceApproval` | `false`      | Mandate approval for maintenance tickets        |

#### Master Data Management

Manage lookup tables used across the application:

| Tab                      | Model               | Purpose                                |
| ------------------------ | ------------------- | -------------------------------------- |
| **Categories**           | `AssetCategory`     | Asset classification                   |
| **Departments**          | `Department`        | Organisational structure               |
| **Locations**            | `Location`          | Physical spaces                        |
| **Vendors**              | `Vendor`            | Suppliers and service providers        |
| **Inventory Categories** | `InventoryCategory` | Inventory item classification          |
| **Units of Measure**     | `UnitOfMeasure`     | Stock quantity units (pcs, kg, litre…) |
| **Inventory Locations**  | `InventoryLocation` | Warehouse/store locations              |

**Components**: `general-settings-form.tsx`, `master-data-list.tsx`, `master-data-modal.tsx`

---

### 7.9 Super Admin

**Routes**: `/super-admin/registrations`, `/super-admin/users`

> Accessible only to users with `isSuperAdmin = true`. Middleware enforces this.

#### Registration Approvals (`/super-admin/registrations`)

Displays all users with `status: PENDING`. For each registration:

- View requested company and role
- **Approve**: Creates `CompanyUser` record, sets `status: ACTIVE`
- **Reject**: Sets `status: REJECTED`, optionally stores `rejectionRemarks`

#### User Management (`/super-admin/users`)

- View all users in the system across all companies
- Review roles and company memberships
- Manage access

---

## 8. API Reference

All API routes are under `/api/*` and return JSON. Authentication is enforced via the NextAuth session.

### Assets

| Method   | Endpoint             | Description                                                                                                               |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/assets`        | List all assets for the active company. Supports `?search`, `?status`, `?categoryId`, `?locationId`, `?vendorId`, `?sort` |
| `POST`   | `/api/assets`        | Create a new asset                                                                                                        |
| `GET`    | `/api/assets/[id]`   | Get a single asset with all relations                                                                                     |
| `PUT`    | `/api/assets/[id]`   | Update an asset                                                                                                           |
| `DELETE` | `/api/assets/[id]`   | Delete an asset                                                                                                           |
| `POST`   | `/api/assets/assign` | Assign an asset to an employee/location                                                                                   |
| `POST`   | `/api/assets/return` | Return an assigned asset                                                                                                  |

### Authentication

| Method | Endpoint                  | Description                                         |
| ------ | ------------------------- | --------------------------------------------------- |
| `POST` | `/api/auth/register`      | Register a new user (creates PENDING account)       |
| `*`    | `/api/auth/[...nextauth]` | NextAuth route handler (sign-in, sign-out, session) |

### Employees

| Method           | Endpoint              | Description                           |
| ---------------- | --------------------- | ------------------------------------- |
| `GET`            | `/api/employees`      | List employees for the active company |
| `POST`           | `/api/employees`      | Create a new employee                 |
| `GET/PUT/DELETE` | `/api/employees/[id]` | Single employee CRUD                  |

### Departments

| Method       | Endpoint                | Description              |
| ------------ | ----------------------- | ------------------------ |
| `GET`        | `/api/departments`      | List departments         |
| `POST`       | `/api/departments`      | Create department        |
| `PUT/DELETE` | `/api/departments/[id]` | Update/delete department |

### Locations

| Method       | Endpoint              | Description                     |
| ------------ | --------------------- | ------------------------------- |
| `GET`        | `/api/locations`      | List locations (with hierarchy) |
| `POST`       | `/api/locations`      | Create location                 |
| `PUT/DELETE` | `/api/locations/[id]` | Update/delete location          |

### Maintenance

| Method           | Endpoint                        | Description                        |
| ---------------- | ------------------------------- | ---------------------------------- |
| `GET/POST`       | `/api/maintenance/tickets`      | List or create maintenance tickets |
| `GET/PUT/DELETE` | `/api/maintenance/tickets/[id]` | Single ticket operations           |
| `GET/POST`       | `/api/maintenance/schedules`    | List or create schedules           |

### Transfers

| Method    | Endpoint              | Description                                        |
| --------- | --------------------- | -------------------------------------------------- |
| `GET`     | `/api/transfers`      | List transfers. Supports `?status`, `?assetId`     |
| `POST`    | `/api/transfers`      | Create a transfer request                          |
| `GET/PUT` | `/api/transfers/[id]` | Get or update (approve/complete/reject) a transfer |

### Settings

| Method     | Endpoint                 | Description                                                                                                                          |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `GET/PUT`  | `/api/settings`          | Get or update company settings                                                                                                       |
| `GET/POST` | `/api/settings/[domain]` | Master data CRUD; domain=`categories`, `departments`, `locations`, `vendors`, `inventory-categories`, `units`, `inventory-locations` |

---

## 9. Key Components

### `AppSidebar`

Navigation sidebar with links to all main modules. Conditionally shows **Approvals (Admin)** and **Users (Admin)** links for Super Admins. User footer with sign-out dropdown.

### `CompanySwitcher`

Dropdown in the top header bar allowing users to switch between companies they belong to. Calls `useSession` `update` trigger to refresh the JWT with the new `activeCompanyId` and role.

### `AssetTableClient`

Full-featured data table for the assets module with:

- Client-side search debounce
- Dropdown filters (status, category, location, vendor)
- Custom sort dropdown
- Row actions (assign, return, edit, delete, transfer)
- Pagination

### `AddAssetModal`

Comprehensive multi-section form:

- **Basic Info**: name, code, tag, category, serial, brand, model
- **Location & Department**: selects from master data
- **Financial**: purchase date/cost, useful life, residual value
- **Warranty**: warranty description and expiry date
- **Condition**: physical and functional status
- **Accessories**: comma-separated accessory list
- **Handover**: optionally create initial assignment inline

### `MasterDataList` / `MasterDataModal`

Generic reusable components in the Settings module that render a CRUD list + modal for any master data entity (categories, vendors, departments, units, etc.).

### `LoginForm` / `RegisterForm`

- **LoginForm**: Email + password credentials, calls `signIn('credentials', ...)`
- **RegisterForm**: Full registration with name, email, mobile, password, role selection, company selection — submits to `/api/auth/register`

---

## 10. Setup & Running Locally

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (or Docker)
- `npm` or `pnpm`

### Step 1 — Clone and Install

```bash
git clone <repo-url>
cd inventory-management
npm install
```

### Step 2 — Configure Environment

Copy `.env.example` to `.env` and fill in values (see [Environment Variables](#11-environment-variables)).

### Step 3 — Database Setup

```bash
# Apply all migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed initial data (companies, super admin user, master data)
npx prisma db seed
```

### Step 4 — Run the Dev Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Step 5 — First Login

After seeding, use the SUPER_ADMIN credentials created in `prisma/seed.ts` to log in. The first user will bypass the approval flow.

### Build for Production

```bash
npm run build
npm run start
```

---

## 11. Environment Variables

| Variable          | Description                               | Example                                         |
| ----------------- | ----------------------------------------- | ----------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string              | `postgresql://user:pass@localhost:5432/assetdb` |
| `NEXTAUTH_SECRET` | Secret key for JWT signing (min 32 chars) | `your-random-32-char-secret`                    |
| `NEXTAUTH_URL`    | Base URL of the application               | `http://localhost:3000`                         |

> **Docker Postgres quick start:**
>
> ```bash
> docker run --name asset-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=assetdb -p 5432:5432 -d postgres:16
> ```

---

## Appendix — Enum Reference

### `AssetStatus`

`ACTIVE` · `ASSIGNED` · `REPAIR` · `DISPOSED` · `LOST`

### `HandoverType`

`NEW_HIRE` · `REPLACEMENT` · `TEMPORARY_LOAN`

### `PhysicalCondition`

`BRAND_NEW` · `USED_EXCELLENT` · `USED_FAIR`

### `FunctionalStatus`

`WORKING` · `MINOR_ISSUES`

### `TicketPriority`

`LOW` · `MEDIUM` · `HIGH` · `CRITICAL`

### `TicketStatus`

`OPEN` · `IN_PROGRESS` · `ON_HOLD` · `PENDING_PARTS` · `RESOLVED` · `CLOSED` · `CANCELLED`

### `MaintenanceType`

`CORRECTIVE` · `PREVENTIVE` · `UPGRADE` · `OTHER`

### `TransferStatus`

`REQUESTED` · `APPROVED` · `IN_TRANSIT` · `COMPLETED` · `REJECTED` · `CANCELLED`

### `TransferType`

`LOCATION_TO_LOCATION` · `EMPLOYEE_TO_EMPLOYEE` · `EMPLOYEE_TO_LOCATION` · `LOCATION_TO_EMPLOYEE`

### `InventoryItemType`

`CONSUMABLE` · `SPARE` · `TOOL` · `OTHER`

### `MovementType`

`OPENING_STOCK` · `PURCHASE_RECEIPT` · `MANUAL_STOCK_IN` · `MANUAL_STOCK_OUT` · `ISSUE_TO_EMPLOYEE` · `ISSUE_TO_ASSET` · `RETURN_IN` · `TRANSFER_IN` · `TRANSFER_OUT` · `ADJUSTMENT_IN` · `ADJUSTMENT_OUT` · `DAMAGED_OUT` · `SCRAP_OUT`

### `Role`

`SUPER_ADMIN` · `COMPANY_ADMIN` · `ASSET_MANAGER` · `INVENTORY_MANAGER` · `MAINTENANCE_MANAGER` · `TECHNICIAN` · `EMPLOYEE` · `AUDITOR` · `FINANCE_VIEWER`

### `UserStatus`

`PENDING` · `ACTIVE` · `REJECTED`
