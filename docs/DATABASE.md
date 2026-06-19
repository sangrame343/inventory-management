# Database Documentation

## Overview

The application uses **Prisma ORM v7** with `@prisma/adapter-pg` (native PostgreSQL driver adapter) connected to:
- **Local:** Docker PostgreSQL 16 on `localhost:5432`
- **Production:** Supabase PostgreSQL (pooled via PgBouncer on port 6543, direct on port 5432)

Schema file: [`prisma/schema.prisma`](../prisma/schema.prisma)

---

## Enums

### Role
User roles within a company context.

| Value | Description |
|---|---|
| `SUPER_ADMIN` | Full authority. Can approve/reject requests. Can manage all companies. |
| `ADMIN` | Can perform actions but writes go through approval workflow. |
| `USER` | Read-only access to assets and dashboard. |

### ApprovalStatus
Status of an approval request.

| Value | Description |
|---|---|
| `PENDING` | Request submitted, waiting for review. |
| `APPROVED` | Super Admin approved the request (action executed). |
| `REJECTED` | Super Admin rejected the request. |
| `CANCELLED` | Requester cancelled the request. |

### ApprovalModule
Which module the approval request relates to.

| Value | Description |
|---|---|
| `ASSET` | Asset operations |
| `INVENTORY` | Inventory operations |
| `EMPLOYEE` | Employee operations |
| `MAINTENANCE` | Maintenance operations |
| `TRANSFER` | Transfer operations |
| `SETTINGS` | Company settings changes |
| `USER` | User management |

### ApprovalAction
What action is being requested.

| Value | Description |
|---|---|
| `CREATE` | Create a new record |
| `UPDATE` | Modify existing record |
| `DELETE` | Delete a record |
| `ASSIGN` | Assign asset to employee/department |
| `TRANSFER` | Transfer asset between locations/employees |
| `IMPORT` | Bulk import from Excel |
| `BULK_DELETE` | Delete multiple records |
| `ISSUE` | Issue inventory stock |
| `REGISTER_AS_ASSET` | Register inventory item as an individual asset |

### UserStatus

| Value | Description |
|---|---|
| `PENDING` | New registration, awaiting Super Admin approval |
| `ACTIVE` | Approved and can login |
| `REJECTED` | Registration rejected |

### AssetStatus

| Value | Description |
|---|---|
| `ACTIVE` | Available, not assigned |
| `ASSIGNED` | Currently assigned to an employee/department |
| `REPAIR` | Under maintenance |
| `DISPOSED` | Decommissioned |
| `LOST` | Reported lost |

### HandoverType

| Value | Description |
|---|---|
| `NEW_HIRE` | Asset given to new employee |
| `REPLACEMENT` | Replacing a previous asset |
| `TEMPORARY_LOAN` | Temporary assignment |
| `NEW_ASSET_ASSIGN` | Fresh asset assignment |
| `ASSET_UPDATE` | Update to existing assignment |
| `ASSIGNED_TO_DEPARTMENT` | Assigned to a department (not individual) |

### PhysicalCondition

| Value | Description |
|---|---|
| `BRAND_NEW` | New, never used |
| `USED_EXCELLENT` | Used but in excellent condition |
| `USED_FAIR` | Used with visible wear |

### FunctionalStatus

| Value | Description |
|---|---|
| `WORKING` | Fully functional |
| `MINOR_ISSUES` | Has minor non-critical issues |

### TicketPriority / TicketStatus / MaintenanceType
Standard ticket management statuses for the maintenance module.

### InventoryItemType

| Value | Description |
|---|---|
| `CONSUMABLE` | Items that get used up (pens, paper) |
| `IT_ASSETS` | Computers, peripherals |
| `TOOL` | Reusable tools |
| `FIXED_ASSETS` | Furniture, fixtures |
| `OTHER` | Uncategorised |
| `ELECTRONICS_ITEMS` | Electronic devices |

### TransferType

| Value | Description |
|---|---|
| `LOCATION_TO_LOCATION` | Between two locations |
| `EMPLOYEE_TO_EMPLOYEE` | Between two employees |
| `EMPLOYEE_TO_LOCATION` | Employee returning to a location |
| `LOCATION_TO_EMPLOYEE` | Sending from location to employee |

### AcknowledgementStatus

| Value | Description |
|---|---|
| `PENDING` | Link sent, waiting for signature |
| `ACKNOWLEDGED` | Successfully signed and receipted |
| `EXPIRED` | Token expired before being used |
| `ARCHIVED` | Manually archived |
| `DELETED` | Soft-deleted |

---

## Core Models

### NextAuth Models

| Model | Purpose |
|---|---|
| `Account` | OAuth provider accounts linked to users |
| `Session` | Server-side session records |
| `VerificationToken` | Email verification tokens |

These are required by `@auth/prisma-adapter` and should not be modified.

### User
Central user record. Links to NextAuth accounts, company roles, and employee records.

**Key fields:**
- `passwordHash` — Bcrypt-hashed password for credentials login
- `activeCompanyId` — Currently selected company context
- `isSuperAdmin` — Legacy flag (primary check is via CompanyUser role)
- `status` — Registration approval status (PENDING → ACTIVE/REJECTED)
- `requestedRole` / `requestedCompanyId` — Used during registration

### Company
Top-level tenant entity.

**Key fields:**
- `code` — Short code used in asset tag/code generation (e.g., "ABPL")
- `lastAssetSequence` — Auto-incrementing counter for unique asset code generation
- `lastInventorySequence` — Auto-incrementing counter for inventory SKU generation
- `lastTransferSequence` — Auto-incrementing counter for transfer codes

### CompanyUser
Join table linking Users to Companies with a Role. This is the core of multi-tenancy.

**Unique constraint:** `[companyId, userId]` — a user can only have one role per company.

### CompanySettings
Per-company configuration.

**Key fields:**
- `assetCodePrefix` — Optional prefix for asset codes
- `currency` — Default "INR"
- `dateFormat` — Default "DD-MM-YYYY"
- `requireTransferApproval` — Whether transfers need SUPER_ADMIN approval
- `requireMaintenanceApproval` — Whether maintenance needs approval
- `autoGenerateAssetCode` — Auto-generate or manual asset codes

### Department
Organisational units within a company. Used for:
- Grouping employees
- "Purchased From" reference on assets (representing a subsidiary or division)
- Assignment targets (assets can be assigned to departments)

### Location
Physical locations with optional hierarchy via `parentLocationId`.

**Self-referential relation:**
```
Location (parent) ←──1:N──▶ Location (children)
```

### AssetCategory
Classification for both assets and inventory items. Shared across both modules.

### Asset
The primary entity of the system.

**Key fields:**
- `assetCode` — Auto-generated: `{COMPANY}-{DEPT}-{CAT}-{SEQ}`
- `assetTag` — Auto-generated: `AST-{DEPT}-{COMPANY}-{SEQ}`
- `purchasedFromDepartmentId` — Which subsidiary/division purchased the asset
- `sourceInventoryItemId` — If this asset was created from inventory stock
- `sourceInventoryAssignmentId` — Links to the inventory assignment that created it

### AssetAssignment
Records an asset being assigned to a user/employee/department.

**Key fields:**
- `transactionId` — Unique transaction reference
- `returnedAt` — NULL while active, set when asset is returned
- `handoverType` — Type of handover (NEW_HIRE, REPLACEMENT, etc.)
- `termsAccepted` — Set to true after acknowledgement signature
- `employeeSignatureName` — Name entered during acknowledgement

### AssetTransfer
Multi-step transfer workflow.

**Flow:** `REQUESTED → APPROVED → IN_TRANSIT → COMPLETED`

**Key fields:**
- `transferCode` — Auto-generated unique transfer reference
- `transferType` — Direction of transfer (L→L, E→E, L→E, E→L)
- Tracks `fromLocation/Employee` → `toLocation/Employee`
- Captures condition before and after transfer

### Employee
Employee records that may or may not be linked to a User account.

**Key fields:**
- `userId` — Optional link to User for login access (unique)
- `employeeCode` — Company-unique employee identifier
- `status` — ACTIVE/INACTIVE

### Vendor
Third-party vendor records for maintenance and procurement tracking.

### MaintenanceTicket
Service tickets for asset maintenance.

**Key fields:**
- Priority levels: LOW → MEDIUM → HIGH → CRITICAL
- Status workflow: OPEN → IN_PROGRESS → RESOLVED → CLOSED
- Cost tracking: `estimatedCost`, `laborCost`, `partsCost`, `cost`

### MaintenanceSchedule
Recurring maintenance schedules.

**Key fields:**
- `frequencyDays` — Interval between maintenance events
- `nextDueDate` — When the next maintenance is due

### ActivityLog
Audit trail for all significant actions in the system.

**Key fields:**
- `action` — What happened (CREATE, UPDATE, DELETE, ACKNOWLEDGE, etc.)
- `entity` / `entityId` — What record was affected
- `details` — JSON blob with additional context

### ApprovalRequest
Stores pending approval requests from ADMINs.

**Key fields:**
- `module` / `action` — What module and action
- `payload` — JSON blob containing the full data to be executed on approval
- `oldData` — Previous state (for update comparisons)
- `targetRecordId` — Existing record ID (for updates/deletes)

---

## Inventory Module Models

### InventoryCategory
Categories specific to inventory (separate from AssetCategory).

### UnitOfMeasure
Units for inventory tracking (e.g., "pcs", "kg", "box").

### InventoryLocation
Storage locations specific to inventory (may mirror regular Locations).

### InventoryItem
Warehouse stock items tracked by quantity.

**Key fields:**
- `sku` — Auto-generated or manual stock keeping unit
- `totalQuantity` — Total pieces ever stocked
- `availableQuantity` — Available for assignment
- `assignedQuantity` — Currently assigned out
- Shares many fields with Asset (brand, model, serial, vendor, etc.)

### InventoryAssignment
Records of inventory being assigned to employees or departments. When assigned, each unit becomes an individual Asset.

### InventoryBalance
Per-location quantity tracking for inventory items.

**Unique constraint:** `[companyId, itemId, locationId]`

### InventoryTransaction
Complete audit trail of all stock movements (IN/OUT).

**Movement types:** `OPENING_STOCK`, `PURCHASE_RECEIPT`, `MANUAL_STOCK_IN/OUT`, `ISSUE_TO_EMPLOYEE`, `ISSUE_TO_ASSET`, `RETURN_IN`, `TRANSFER_IN/OUT`, `ADJUSTMENT_IN/OUT`, `DAMAGED_OUT`, `SCRAP_OUT`

### InventoryAdjustment
Records of stock count corrections with reason codes.

---

## Acknowledgement Models

### AssetAcknowledgement
Single-asset acknowledgement records.

**Key fields:**
- `tokenHash` — SHA-256 hash of the acknowledgement token (never store raw token)
- `tokenExpiresAt` — When the link expires
- Snapshot fields for audit trail (asset name, code, tag, condition at time of assignment)
- `signaturePath` / `pdfReceiptPath` — Storage paths for signature and PDF
- `ipAddress`, `userAgent`, `browserName`, `deviceType` — Audit metadata

### EmployeeAssetAcknowledgementBatch
Batch acknowledgement for multiple assets assigned to one employee.

### EmployeeAssetAcknowledgementItem
Individual asset entries within a batch acknowledgement.

---

## Important Relations

```
Company ──1:N──▶ CompanyUser ──N:1──▶ User
Company ──1:N──▶ Department
Company ──1:N──▶ Location
Company ──1:N──▶ AssetCategory
Company ──1:N──▶ Asset
Company ──1:N──▶ Employee

Asset   ──N:1──▶ AssetCategory
Asset   ──N:1──▶ Department (current)
Asset   ──N:1──▶ Department (purchasedFrom)
Asset   ──N:1──▶ Location
Asset   ──1:N──▶ AssetAssignment
Asset   ──1:N──▶ AssetTransfer
Asset   ──1:N──▶ MaintenanceTicket

AssetAssignment ──1:1──▶ AssetAcknowledgement
AssetAssignment ──N:1──▶ Employee

Employee ──0:1──▶ User
Employee ──N:1──▶ Department
Employee ──N:1──▶ Location

InventoryItem ──1:N──▶ InventoryBalance (per location)
InventoryItem ──1:N──▶ InventoryTransaction
InventoryItem ──1:N──▶ InventoryAssignment
InventoryItem ──1:N──▶ Asset (created from inventory)
```

---

## Migration Workflow

### Local Development

```bash
# Edit prisma/schema.prisma
# Then create a migration:
npx prisma migrate dev --name describe_your_change

# This will:
# 1. Create a new migration file in prisma/migrations/
# 2. Apply it to your local database
# 3. Regenerate the Prisma client
```

### Production

```bash
# After pushing code with new migrations:
npx prisma migrate deploy
```

`prisma migrate deploy` applies all pending migrations without generating new ones.

### Current Migration History

| Migration | Description |
|---|---|
| `20260403072058_upgrade_maintenance_v1` | Initial maintenance module |
| `20260605113000_add_performance_indexes` | Database performance optimisation indexes |
| `20260611104240_add_asset_acknowledgement` | Single-asset acknowledgement model |
| `20260611113132_add_archive_deleted_fields` | Soft-delete and archive fields |
| `20260611115350_add_employee_acknowledgement_batch` | Batch acknowledgement model |
| `20260615061104_add_department_to_acknowledgement_batch` | Department linking for batches |
| `20260615111858_add_inventory_sequence_to_company` | Auto-increment counter for inventory SKUs |

---

## Local DB vs Production DB

| Aspect | Local (Docker) | Production (Supabase) |
|---|---|---|
| Connection | `localhost:5432` | Supabase pooler on `:6543` (pooled) or `:5432` (direct) |
| Data | Test/sample data | Real production data |
| Reset | `prisma migrate reset` is safe | **NEVER reset production** |
| Migrations | `prisma migrate dev` | `prisma migrate deploy` |
| Push | `prisma db push` is acceptable | **NEVER use `db push` in production** |
| Seed | `prisma db seed` is safe | **NEVER seed production** |

---

## How to Safely Apply Schema Changes

### Step-by-Step Process

1. **Make schema changes** in `prisma/schema.prisma` on your local machine
2. **Create migration locally:**
   ```bash
   npx prisma migrate dev --name describe_change
   ```
3. **Test locally** — verify the migration works and your app runs correctly
4. **Commit the migration file** (the SQL file in `prisma/migrations/`) to Git
5. **Push to GitHub** → Vercel auto-deploys
6. **Run production migration:**
   ```bash
   # Set DIRECT_URL to your Supabase direct connection
   npx prisma migrate deploy
   ```
7. **Verify** the production app works correctly

---

## ⚠️ What NOT to Do

### 🚫 Do NOT use `prisma db push` in production

`db push` modifies the database schema without creating migration files. This leads to:
- No migration history
- No rollback capability
- Schema drift between local and production

### 🚫 Do NOT reset the production database

```bash
# NEVER run this against production:
npx prisma migrate reset
```

This **drops all tables** and recreates them. All production data will be permanently lost.

### 🚫 Do NOT sync local test data to production

The seed script (`prisma db seed`) creates test data. Never run it against production. If you need production seed data, create a separate migration with INSERT statements.

### 🚫 Do NOT edit existing migration files

Once a migration is committed and applied (especially to production), never modify its SQL. Create a new migration instead.

### 🚫 Do NOT use `prisma migrate dev` in production

`migrate dev` is designed for development — it may drop and recreate tables. Use `migrate deploy` for production.
