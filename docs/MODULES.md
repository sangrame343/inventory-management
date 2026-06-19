# Module Documentation

This document covers every application module, its purpose, key files, database models, main flows, and important business rules.

---

## 1. Authentication

### Purpose
Handles user registration, login, logout, and session management.

### Key Files
| File | Purpose |
|---|---|
| `src/lib/auth.ts` | Full NextAuth configuration with Credentials provider |
| `src/auth.config.ts` | Edge-safe auth config (no DB imports, used in middleware) |
| `src/proxy.ts` | Middleware — auth gate + role-based route protection |
| `src/app/(auth)/login/` | Login page |
| `src/app/(auth)/register/` | Registration page |
| `src/components/login-form.tsx` | Login form component |
| `src/components/register-form.tsx` | Registration form component |
| `src/app/actions/auth-actions.ts` | Login/register server actions |
| `src/app/api/auth/[...nextauth]/` | NextAuth API handler |

### Database Models
- `User` — user accounts
- `Account` — OAuth provider links
- `Session` — server sessions (not used with JWT strategy)
- `VerificationToken` — email verification

### Main Flow
1. User visits `/register` → fills form → server action creates User with `status: PENDING`
2. Super Admin approves user in super-admin panel → `status: ACTIVE`
3. User visits `/login` → enters credentials → bcrypt password comparison
4. On success: JWT token created with `id`, `role`, `activeCompanyId`, `companyIds`, `isSuperAdmin`
5. JWT is refreshed on company switch via `trigger: "update"`

### Business Rules
- Passwords are hashed with `bcryptjs` before storage
- Users with `PENDING` status cannot login (error message shown)
- Users with `REJECTED` status cannot login (error message shown)
- JWT session strategy (no database sessions)
- Edge-compatible auth config in `auth.config.ts` (no Prisma imports)

---

## 2. Users and Roles

### Purpose
Manages user accounts, role assignments, and registration approval flow.

### Key Files
| File | Purpose |
|---|---|
| `src/app/actions/super-admin-actions.ts` | User approval, rejection, role management |
| `src/app/(dashboard)/super-admin/` | Super admin panel pages |
| `src/lib/permissions.ts` | Role-based permission checking |

### Database Models
- `User` — core user data
- `CompanyUser` — user-company-role junction table

### Main Flow
1. New user registers → `User.status = PENDING`
2. Super Admin sees pending users in super-admin panel
3. Super Admin approves → creates `CompanyUser` record with assigned role
4. User can now login and access the system

### Business Rules
- One user can belong to multiple companies (via CompanyUser)
- Each CompanyUser has exactly one role per company
- SUPER_ADMIN sees all companies; others only see their assigned companies
- `isSuperAdmin` flag on User is a legacy safety check

---

## 3. Company

### Purpose
Multi-tenant company management with company switching.

### Key Files
| File | Purpose |
|---|---|
| `src/app/actions/company-actions.ts` | Company CRUD and switching |
| `src/components/company-switcher.tsx` | Company selector dropdown |
| `src/components/company-switcher-wrapper.tsx` | Wrapper for client-side switching |

### Database Models
- `Company` — company details, code, sequence counters
- `CompanyUser` — user-company membership
- `CompanySettings` — per-company configuration

### Main Flow
1. Super Admin creates a company with name and optional code
2. Users are assigned to companies via CompanyUser
3. User selects active company via the company switcher
4. All subsequent queries are scoped to `activeCompanyId`

### Business Rules
- Company `code` is unique and used in asset code/tag generation
- `lastAssetSequence`, `lastTransferSequence`, `lastInventorySequence` auto-increment for unique code generation
- Switching company updates the JWT via `unstable_update`

---

## 4. Employees

### Purpose
Manage employee records independently from user accounts. Not all employees need login access.

### Key Files
| File | Purpose |
|---|---|
| `src/app/actions/employee-actions.ts` | Employee CRUD |
| `src/app/actions/import-employees-actions.ts` | Bulk import from Excel |
| `src/app/(dashboard)/employees/` | Employee listing and detail pages |
| `src/components/employees/` | Employee UI components |

### Database Models
- `Employee` — employee record
- `User` — optional link via `userId`

### Main Flow
1. Admin creates employee with code, name, department, location
2. Optionally links employee to a User account (for login access)
3. Assets can be assigned to employees
4. Employee appears in transfer and acknowledgement workflows

### Business Rules
- `employeeCode` must be unique within a company
- Employee can exist without a User (no login access)
- Employee can be linked to exactly one User (`userId` is unique)
- Deleting an employee sets `userId` to NULL on the User (doesn't delete user)

---

## 5. Departments

### Purpose
Organisational units used for grouping employees, assets, and as "purchased from" references.

### Key Files
| File | Purpose |
|---|---|
| `src/app/api/departments/` | Department API routes |
| `src/app/(dashboard)/` (various pages) | Department selectors |

### Database Models
- `Department` — department details

### Business Rules
- Department `name` is unique within a company
- Department `code` is unique within a company and used in asset code generation
- Departments serve dual purpose: organisational grouping AND "purchased from" (subsidiary/division tracking)
- Assets have both `departmentId` (current department) and `purchasedFromDepartmentId`

---

## 6. Locations

### Purpose
Hierarchical physical locations for asset and employee placement.

### Key Files
| File | Purpose |
|---|---|
| `src/app/api/locations/` | Location API routes |
| `src/app/(dashboard)/locations/` | Location management page |
| `src/components/locations/` | Location UI components |

### Database Models
- `Location` — location details with optional parent

### Business Rules
- Locations support hierarchy via `parentLocationId` (self-referential)
- Location `name` and `code` are unique within a company
- Assets and employees reference locations
- Transfers track source and destination locations

---

## 7. Asset Categories

### Purpose
Classification system for organising assets and inventory items.

### Key Files
- Used in asset and inventory creation forms as a selector
- API routes under `src/app/api/assets/` or inline queries

### Database Models
- `AssetCategory` — category details

### Business Rules
- Category `name` and `code` are unique within a company
- Category `code` is used in auto-generated asset codes (e.g., `ABPL-ITDEPT-LAP-42`)
- Shared between the Asset and Inventory modules

---

## 8. Assets

### Purpose
Core asset lifecycle management — from creation to disposal.

### Key Files
| File | Purpose |
|---|---|
| `src/app/actions/asset-actions.ts` | Asset CRUD, duplication |
| `src/app/actions/import-assets-actions.ts` | Bulk import from Excel |
| `src/app/(dashboard)/assets/` | Asset listing and detail pages |
| `src/components/assets/` | Asset UI components |
| `src/lib/asset-utils.ts` | Asset code/tag generation |

### Database Models
- `Asset` — the core asset record

### Main Flow
1. Admin creates asset → auto-generates `assetCode` and `assetTag`
2. Code format: `{COMPANY_CODE}-{PURCHASED_FROM_CODE}-{CATEGORY_CODE}-{SEQUENCE}`
3. Tag format: `AST-{PURCHASED_FROM_CODE}-{COMPANY_CODE}-{SEQUENCE}`
4. Asset starts with status `ACTIVE`
5. Assigned → status becomes `ASSIGNED`
6. Can be transferred, maintained, disposed

### Business Rules
- `assetTag` and `assetCode` are unique within a company
- Company's `lastAssetSequence` increments atomically during creation
- Assets can be duplicated (creates a copy with new codes, no serial number)
- Assets can be created from inventory items (linked via `sourceInventoryItemId`)
- ADMIN role: all write operations go through approval workflow
- SUPER_ADMIN role: direct execution

---

## 9. Asset Assignment

### Purpose
Track asset handovers to employees or departments.

### Key Files
| File | Purpose |
|---|---|
| `src/app/actions/asset-actions.ts` | Assignment creation within asset actions |
| `src/lib/services/approval-service.ts` | `ASSET_ASSIGN` handler |

### Database Models
- `AssetAssignment` — assignment record
- `AssetAcknowledgement` — linked acknowledgement

### Main Flow
1. Admin assigns asset to employee/department
2. `AssetAssignment` record created with handover details
3. Asset status changes to `ASSIGNED`
4. Optional: Generate acknowledgement link for digital signature
5. When returned: `returnedAt` is set, asset status reverts to `ACTIVE`

### Business Rules
- Each assignment has a unique `transactionId`
- Active assignment: `returnedAt IS NULL`
- `handoverType` captures the reason for assignment
- `physicalCondition` and `functionalStatus` document asset state at handover
- `termsAccepted` becomes true after digital acknowledgement

---

## 10. Asset Transfer

### Purpose
Multi-step workflow for transferring assets between locations and employees.

### Key Files
| File | Purpose |
|---|---|
| `src/app/api/transfers/` | Transfer API routes |
| `src/app/(dashboard)/transfers/` | Transfer listing and management |
| `src/components/transfers/` | Transfer UI components |

### Database Models
- `AssetTransfer` — transfer record with full lifecycle

### Main Flow
```
REQUESTED → APPROVED → IN_TRANSIT → COMPLETED
     ↓           ↓
  CANCELLED   REJECTED
```

1. Admin requests transfer (specifies from/to location or employee)
2. Transfer code auto-generated
3. If approval required: SUPER_ADMIN approves/rejects
4. Once approved: marked as IN_TRANSIT
5. When received: marked as COMPLETED, asset location/assignment updated

### Business Rules
- `transferCode` is globally unique
- Company setting `requireTransferApproval` controls if approval is needed
- Condition tracked before and after transfer
- Four transfer types supported (L→L, E→E, L→E, E→L)

---

## 11. Inventory

### Purpose
Warehouse-style stock management with quantity tracking across locations.

### Key Files
| File | Purpose |
|---|---|
| `src/app/actions/inventory-item-actions.ts` | Inventory item CRUD |
| `src/app/actions/inventory-transaction-actions.ts` | Stock movements |
| `src/app/actions/inventory-master-actions.ts` | Master data (categories, units, locations) |
| `src/app/actions/import-inventory-actions.ts` | Bulk import |
| `src/app/(dashboard)/inventory/` | Inventory pages |
| `src/components/inventory/` | Inventory UI components |

### Database Models
- `InventoryItem` — stock item definition
- `InventoryBalance` — quantity per location
- `InventoryTransaction` — movement audit trail
- `InventoryAdjustment` — stock count corrections
- `InventoryCategory` — inventory-specific categories
- `UnitOfMeasure` — measurement units
- `InventoryLocation` — storage locations

### Main Flow
1. Create inventory item with SKU, name, category, initial quantity
2. Stock movements tracked via InventoryTransaction (IN/OUT)
3. InventoryBalance updated atomically per location
4. Stock adjustments create InventoryAdjustment + InventoryTransaction
5. Items can be issued to employees (creating individual Assets)

### Business Rules
- SKU auto-generated: `INV-{DEPT_CODE}-{CAT_CODE}-{SEQ}`
- `availableQuantity = totalQuantity - assignedQuantity`
- `InventoryBalance.availableQty = quantityOnHand - reservedQty`
- Stock cannot go negative (validation before decrement)
- InventoryLocation may auto-create from regular Location

---

## 12. Inventory Stock Management

### Purpose
Track stock levels, movements, and adjustments at the location level.

### Key Files
- Same as Inventory module files above

### Main Flow

#### Stock In
```
Purchase/Receipt → InventoryTransaction(direction: IN) → InventoryBalance updated
```

#### Stock Out
```
Issue/Transfer → InventoryTransaction(direction: OUT) → InventoryBalance updated
```

#### Stock Adjustment
```
Physical count differs → InventoryAdjustment created → InventoryTransaction(ADJUSTMENT_IN/OUT) → Balance corrected
```

---

## 13. Inventory Assignment

### Purpose
Issue inventory stock to employees or departments, automatically creating individual Asset records.

### Key Files
| File | Purpose |
|---|---|
| `src/lib/services/approval-service.ts` | `INVENTORY_ASSIGN` and `INVENTORY_ISSUE` handlers |

### Main Flow
1. Admin issues N units from inventory to an employee
2. System validates available quantity at location
3. InventoryAssignment record created
4. For each unit: a new Asset record is created with auto-generated codes
5. If assigning to employee: AssetAssignment also created, asset status → ASSIGNED
6. InventoryItem quantities updated (availableQuantity decremented)
7. InventoryBalance at location decremented

### Business Rules
- Each issued unit becomes a separate Asset record
- Assets link back to source inventory via `sourceInventoryItemId`
- Asset inherits properties from inventory item (brand, model, specs, etc.)
- InventoryLocation auto-maps to Location (creates if missing)
- Serial numbers can be assigned per-piece during issuance

---

## 14. Maintenance

### Purpose
Track and manage asset maintenance, repairs, and preventive schedules.

### Key Files
| File | Purpose |
|---|---|
| `src/app/api/maintenance/` | Maintenance API routes |
| `src/app/(dashboard)/maintenance/` | Maintenance management pages |
| `src/components/maintenance/` | Maintenance UI components |

### Database Models
- `MaintenanceTicket` — individual maintenance tickets
- `MaintenanceSchedule` — recurring maintenance schedules
- `Vendor` — third-party service providers

### Main Flow
1. Create ticket for an asset (corrective, preventive, upgrade, other)
2. Assign to a user or vendor
3. Track through: OPEN → IN_PROGRESS → RESOLVED → CLOSED
4. Record costs (estimated, labor, parts, total)
5. Schedules auto-calculate next due date based on frequency

### Business Rules
- Tickets have priority levels (LOW, MEDIUM, HIGH, CRITICAL)
- Downtime hours tracked for reporting
- Can be ON_HOLD or PENDING_PARTS
- Schedules track `frequencyDays` and compute `nextDueDate`

---

## 15. Approval Workflow

### Purpose
Enforce review process where ADMINs submit change requests and SUPER_ADMINs approve or reject them.

### Key Files
| File | Purpose |
|---|---|
| `src/lib/permissions.ts` | `checkPermission()` — determines ALLOW/REQUIRE_APPROVAL/DENY |
| `src/lib/services/approval-service.ts` | `ApprovalService` — execution engine with handler map |
| `src/app/actions/approval-actions.ts` | Approval/rejection server actions |
| `src/app/(dashboard)/approvals/` | SUPER_ADMIN approval queue page |
| `src/app/(dashboard)/my-requests/` | ADMIN pending requests page |
| `src/components/approvals/` | Approval UI components |

### Database Models
- `ApprovalRequest` — stores request with full payload
- `ActivityLog` — audit trail for all approval actions

### Main Flow
1. ADMIN performs write action → `checkPermission()` returns `REQUIRE_APPROVAL`
2. `ApprovalRequest` created with:
   - `module` (ASSET, INVENTORY, etc.)
   - `action` (CREATE, UPDATE, DELETE, etc.)
   - `payload` (full data needed to execute the action)
   - `targetRecordId` (for updates/deletes)
3. SUPER_ADMIN sees request in `/approvals`
4. On approval:
   - `ApprovalService` looks up handler: `{MODULE}_{ACTION}` (e.g., `ASSET_CREATE`)
   - Handler executes the stored payload within a Prisma transaction
   - Request status → APPROVED
5. On rejection:
   - Request status → REJECTED
   - Review note recorded

### Business Rules
- SUPER_ADMIN bypasses approval entirely (direct execution)
- USER role is denied all write actions
- ADMIN can request: CREATE, UPDATE, DELETE, ASSIGN, TRANSFER, ISSUE, REGISTER_AS_ASSET, IMPORT, BULK_DELETE
- Payload stores complete data needed — if source data changes between request and approval, the stored payload is used
- Handler map in approval-service.ts covers all module+action combinations

---

## 16. Asset Acknowledgement (Public Link System)

See [ASSET_ACKNOWLEDGEMENT.md](./ASSET_ACKNOWLEDGEMENT.md) for complete documentation.

### Summary
- Token-based public links for employees to digitally sign asset receipts
- Supports single-asset and batch (multi-asset) acknowledgements
- Generates PDF receipt with digital signature embedded
- Stores signature PNG and receipt PDF in Supabase Storage

---

## 17. Backup/Export System

### Purpose
Export database data as SQL dump files for backup and data portability.

### Key Files
| File | Purpose |
|---|---|
| `src/app/api/backup/route.ts` | Backup API endpoint |

### Main Flow
1. Super Admin triggers backup from the settings/admin panel
2. API connects to target database (local or production)
3. Discovers all public tables (excludes `_prisma_migrations`)
4. Generates INSERT statements for all rows
5. Returns as downloadable `.sql` file

### Business Rules
- **Super Admin only** — other roles get 401
- Can target local or production database via `?target=local|prod`
- Uses `DIRECT_URL` for production (bypasses PgBouncer)
- Generates `TRUNCATE + INSERT ON CONFLICT DO NOTHING` statements
- Batch inserts in groups of 500 rows
- 60-second max duration (Vercel limit)

---

## 18. Settings

### Purpose
Per-company configuration for asset codes, currency, approvals, and formatting.

### Key Files
| File | Purpose |
|---|---|
| `src/app/api/settings/` | Settings API routes |
| `src/app/(dashboard)/settings/` | Settings management page |
| `src/components/settings/` | Settings UI components |
| `src/services/settings-service.ts` | Settings data access |

### Database Models
- `CompanySettings` — per-company configuration

### Configurable Options
| Setting | Default | Description |
|---|---|---|
| `assetCodePrefix` | NULL | Optional prefix for asset codes |
| `currency` | "INR" | Currency symbol for costs |
| `dateFormat` | "DD-MM-YYYY" | Display date format |
| `maintenanceReminderDays` | 7 | Days before maintenance reminder |
| `requireTransferApproval` | true | Transfers need SUPER_ADMIN approval |
| `requireMaintenanceApproval` | false | Maintenance needs approval |
| `autoGenerateAssetCode` | true | Auto-generate or manual asset codes |

### Business Rules
- Only SUPER_ADMIN can modify settings
- Settings are company-scoped (each company has its own)
- Settings are auto-created on first access if missing
