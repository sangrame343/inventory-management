# Asset Acknowledgement System

## Overview

The Asset Acknowledgement System allows employees and department representatives to **digitally sign** for assets they have received, without needing a login account. A unique, time-limited link is generated and sent to the recipient. They open it in any browser, review the asset details, draw their signature, and submit. The system generates a PDF receipt and stores both the signature image and receipt in private storage.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                             │
│  1. Assigns asset to employee                                    │
│  2. Clicks "Generate Acknowledgement Link"                       │
│  3. System generates crypto-random token                         │
│  4. SHA-256 hash stored in DB (never the raw token)              │
│  5. Raw token used in the URL (sent to employee)                 │
│  6. Link format:                                                 │
│     Single: /acknowledge/{raw-token}                             │
│     Batch:  /acknowledge/employee/{raw-token}                    │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   PUBLIC ACKNOWLEDGEMENT PAGE                     │
│  /acknowledge/[token] or /acknowledge/employee/[token]           │
│                                                                  │
│  1. GET request → API validates token:                           │
│     a. Hash the token from URL                                   │
│     b. Look up hash in DB                                        │
│     c. Check status (must be PENDING)                            │
│     d. Check expiry                                              │
│     e. Return asset/employee details                             │
│  2. User reviews details                                         │
│  3. User types their name                                        │
│  4. User draws signature on canvas                               │
│  5. User accepts terms                                           │
│  6. POST request → API processes:                                │
│     a. Validate signature data                                   │
│     b. Generate PDF receipt                                      │
│     c. Upload signature PNG to storage                           │
│     d. Upload PDF receipt to storage                             │
│     e. Update DB in transaction                                  │
│     f. Invalidate token (change hash to prevent reuse)           │
│     g. Log activity                                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Two Acknowledgement Modes

### 1. Single Asset Acknowledgement

- **Model:** `AssetAcknowledgement`
- **Route:** `/acknowledge/[token]`
- **API:** `/api/acknowledge/[token]` (GET + POST)
- **Use case:** One asset assigned to one employee or department
- **PDF:** Single-page receipt with one asset's details

### 2. Batch Employee Acknowledgement

- **Model:** `EmployeeAssetAcknowledgementBatch` + `EmployeeAssetAcknowledgementItem[]`
- **Route:** `/acknowledge/employee/[token]`
- **API:** `/api/acknowledge/employee/[token]` (GET + POST)
- **Use case:** Multiple assets assigned to the same employee — one signature covers all
- **PDF:** Combined receipt with asset table listing all items

---

## Token Security

### Token Generation

```typescript
// src/lib/crypto-utils.ts
import crypto from "crypto";

// Generate 32 random bytes → 64-character hex string
function generateAcknowledgementToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
```

The raw token is a **64-character hexadecimal string** generated from 32 cryptographically secure random bytes.

### Token Hashing

```typescript
// src/lib/crypto-utils.ts
function hashAcknowledgementToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

- The **raw token** is NEVER stored in the database
- Only the **SHA-256 hash** is stored in `tokenHash`
- When a user visits the link, the token from the URL is hashed and compared against the stored hash
- This means even if the database is compromised, the attacker cannot reconstruct valid acknowledgement URLs

### Token Invalidation

After successful acknowledgement, the `tokenHash` is replaced with a non-reversible value:

```typescript
// Single: used_{id}_{random}
tokenHash: `used_${ack.id}_${crypto.randomBytes(8).toString("hex")}`

// Batch: used_batch_{id}_{random}
tokenHash: `used_batch_${batch.id}_${crypto.randomBytes(8).toString("hex")}`

// Batch items: batch_{batchId}_{itemId}_{random}
tokenHash: `batch_${batch.id}_${item.id}_${crypto.randomBytes(4).toString("hex")}`
```

This ensures:
- The original token can never be used again (the hash no longer matches)
- The link becomes permanently invalid
- Even replaying the same token produces a different hash than what's stored

### Token Expiration

- `tokenExpiresAt` field stores when the link expires
- On every GET/POST request, the expiry is checked
- If expired, the status is updated to `EXPIRED` and the request is rejected

---

## Public Acknowledgement Page

### URL Format
```
https://your-app.vercel.app/acknowledge/{64-char-hex-token}
https://your-app.vercel.app/acknowledge/employee/{64-char-hex-token}
```

### Page Behaviour

1. **Loading:** Shows loading state while fetching acknowledgement details
2. **Valid Token:** Displays:
   - Company name and logo
   - Assignee name and department
   - Asset details (name, code, tag, condition)
   - Assignment date and location
   - Name input field (employee must type their name)
   - Canvas for drawing signature
   - Terms & conditions checkbox
   - Submit button
3. **Already Acknowledged:** Shows "already acknowledged" error
4. **Expired:** Shows "expired link" error
5. **Invalid:** Shows "invalid link" error

### No Authentication Required

The acknowledgement routes are explicitly excluded from middleware auth checks:

```typescript
// src/proxy.ts
const isPublicAcknowledgeRoute = 
  req.nextUrl.pathname.startsWith("/acknowledge") || 
  req.nextUrl.pathname.startsWith("/api/acknowledge");

if (isApiAuthRoute || isPublicAcknowledgeRoute) return; // Skip auth
```

---

## Signature Storage

### Production (Supabase Storage)

| Bucket | Path Pattern | Content Type |
|---|---|---|
| `asset-signatures` | `signatures/{companyId}/{assignmentId}.png` | `image/png` |
| `asset-receipts` | `receipts/{companyId}/{assignmentId}.pdf` | `application/pdf` |

For batch acknowledgements:
| Bucket | Path Pattern | Content Type |
|---|---|---|
| `asset-signatures` | `signatures/{companyId}/employee_batch_{batchId}.png` | `image/png` |
| `asset-receipts` | `receipts/{companyId}/employee_batch_{batchId}.pdf` | `application/pdf` |

Both buckets are **private**. Files are accessed via signed URLs generated by `StorageService.getSignedUrl()` with a 1-hour default expiry.

### Development (Local Filesystem)

```
public/uploads/
├── asset-signatures/
│   └── signatures/{companyId}/{assignmentId}.png
└── asset-receipts/
    └── receipts/{companyId}/{assignmentId}.pdf
```

Local files are accessed via the API route:
```
/api/admin/local-storage?bucket=asset-signatures&path=signatures/{companyId}/{assignmentId}.png
```

### StorageService Class

```typescript
// src/lib/storage-service.ts
class StorageService {
  // Upload file — Supabase if configured, local filesystem otherwise
  static async uploadFile(bucketName, filePath, body, contentType): Promise<string>

  // Delete file — used for rollbacks
  static async deleteFile(bucketName, filePath): Promise<void>

  // Get signed URL (Supabase) or local API URL
  static async getSignedUrl(bucketName, filePath, expiresInSeconds): Promise<string>
}
```

The service automatically detects whether Supabase is configured:
- If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set → uses Supabase Storage
- Otherwise → falls back to local filesystem under `public/uploads/`

---

## PDF Receipt Generation

PDF receipts are generated server-side using `pdf-lib`.

### Single Asset Receipt Contents

| Section | Details |
|---|---|
| **Header** | Department/company name, "OFFICIAL ASSET HANDOVER & SIGN-OFF RECEIPT" |
| **Assignee Details** | Name, department, location, date assigned |
| **Asset Details** | Name, asset tag, asset code, brand, model, serial number |
| **Handover & Metadata** | Handover type, functional status, condition, notes |
| **Compliance Agreement** | Legal terms about responsibility and liability |
| **Authorization Sign-Off** | Signer name, timestamp, embedded digital signature image |
| **Audit Trail** | IP address, browser, device type, user agent |

### Batch Receipt Contents

Similar to single receipt but includes an **asset table** with columns:
- Asset Name, Asset Tag, Serial Number, Location, Assigned Date

### PDF Specifications
- Page size: A4 (595 × 842 points)
- Fonts: Helvetica (regular + bold)
- Color scheme: Dark header banner, muted section dividers
- Signature embedded as PNG image
- User agent truncated to fit (max 85 chars per line)

---

## Database Updates (Transaction)

All database updates during acknowledgement submission happen within a Prisma `$transaction`:

### Single Asset
1. Update `AssetAcknowledgement`: status → ACKNOWLEDGED, store paths, audit data, invalidate token
2. Update `AssetAssignment`: set `termsAccepted = true`, store signer name
3. Create `ActivityLog` entry

### Batch Employee
1. Update `EmployeeAssetAcknowledgementBatch`: status → ACKNOWLEDGED, invalidate token
2. For each item: upsert `AssetAcknowledgement` (create if missing, update if exists)
3. For each item: update `AssetAssignment` (`termsAccepted = true`)
4. Create `ActivityLog` entry

---

## Rollback on Failure

The system implements a manual rollback for file uploads:

```typescript
let uploadedSig = false;
let uploadedPdf = false;

try {
  // Upload signature
  await StorageService.uploadFile("asset-signatures", sigPath, ...);
  uploadedSig = true;

  // Upload PDF
  await StorageService.uploadFile("asset-receipts", pdfPath, ...);
  uploadedPdf = true;

  // Database transaction
  await db.$transaction(async (tx) => { ... });

} catch (error) {
  // Rollback uploaded files if DB commit failed
  if (uploadedSig) await StorageService.deleteFile("asset-signatures", sigPath);
  if (uploadedPdf) await StorageService.deleteFile("asset-receipts", pdfPath);
}
```

---

## Audit Trail Data Captured

| Field | Source | Purpose |
|---|---|---|
| `ipAddress` | `x-forwarded-for` / `x-real-ip` header | Identify originating network |
| `userAgent` | `user-agent` header | Full browser identification |
| `browserName` | Parsed from user agent | Human-readable browser name |
| `deviceType` | Parsed from user agent | desktop / mobile / tablet |
| `termsAccepted` | User checkbox | Legal acceptance proof |
| `acknowledgedByName` | User text input | Typed name confirmation |
| `usedAt` | Server timestamp | When acknowledgement was submitted |

---

## Security Precautions

1. **Token hashing**: Raw tokens never stored in database. SHA-256 hash comparison only.
2. **Token invalidation**: Hash is replaced after use, preventing replay attacks.
3. **Token expiration**: Time-limited links with server-side expiry check.
4. **Private storage**: Signature/receipt buckets are private (not publicly accessible).
5. **Signed URLs**: Files accessed only via time-limited signed URLs.
6. **No auth bypass for data**: Public routes only access acknowledgement-specific data, never admin data.
7. **Signature validation**: Base64 PNG data validated before processing.
8. **Transactional updates**: Database changes are atomic — all succeed or all fail.
9. **File rollback**: Uploaded files are cleaned up if the database transaction fails.
10. **Activity logging**: Every acknowledgement is logged with full audit metadata.
11. **Status checks**: Multiple validation gates (PENDING status, expiry, valid token).
