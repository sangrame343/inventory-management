# PowerShell script to properly restore database from backup
# Strategy:
#   1. Run ALL TRUNCATE statements first (in one go)
#   2. Run ALL INSERT statements with session_replication_role=replica (no FK checks)
#   3. This avoids CASCADE truncation wiping freshly-inserted data

$backupFile = "backup_local_2026-06-04T11-02-27.sql"

Write-Host "Reading backup file..."
$content = Get-Content $backupFile -Raw -Encoding UTF8

# Fix empty JSON arrays '[]' -> '{}'
Write-Host "Fixing JSON array literals..."
$content = $content -replace "'(\[\])'", "'{}'"
# Fix non-empty JSON arrays like '["item1"]' -> '{"item1"}'
$content = [regex]::Replace($content, "'(\[[^\[\]']+\])'", {
    param($m)
    $inner = $m.Groups[1].Value
    $inner = $inner -replace '^\[', '{'
    $inner = $inner -replace '\]$', '}'
    return "'" + $inner + "'"
})

Write-Host "Splitting backup into truncate and insert phases..."

$lines = $content -split "`n"

$truncateLines = @()
$insertLines = @()
$inInsertBlock = $false

foreach ($line in $lines) {
    $trimmed = $line.TrimEnd()
    
    if ($trimmed -match '^TRUNCATE TABLE') {
        $truncateLines += $trimmed
        $inInsertBlock = $false
    } elseif ($trimmed -match '^INSERT INTO' -or $trimmed -match '^--' -or $trimmed -match '^\s*\(' -or $trimmed -match '^ON CONFLICT') {
        if ($trimmed -match '^INSERT INTO') {
            $inInsertBlock = $true
        }
        if ($inInsertBlock -or $trimmed -match '^INSERT INTO') {
            $insertLines += $trimmed
        }
    } elseif ($trimmed -match '^SET ') {
        $insertLines += $trimmed
    } elseif ($trimmed -match '^\s*$' -and $inInsertBlock) {
        $insertLines += $trimmed
    } elseif ($inInsertBlock -and ($trimmed -match '^\)' -or $trimmed -match "^  '\(")) {
        $insertLines += $trimmed
    }
}

Write-Host "Truncate statements: $($truncateLines.Count)"
Write-Host "Insert statements (lines): $($insertLines.Count)"

# Write phase 1: Truncate all tables in proper order (no CASCADE issues if done all at once)
$allTables = @(
    '"ActivityLog"', '"Account"', '"ApprovalRequest"', '"AssetTransfer"', '"AssetAssignment"',
    '"MaintenanceTicket"', '"MaintenanceSchedule"', '"EmployeeAssetAcknowledgementItem"',
    '"AssetAcknowledgement"', '"EmployeeAssetAcknowledgementBatch"',
    '"InventoryTransaction"', '"InventoryAssignment"', '"InventoryAdjustment"', '"InventoryBalance"',
    '"InventoryItem"', '"Asset"', '"Employee"', '"CompanyUser"', '"Session"', '"VerificationToken"',
    '"ApprovalRequest"', '"Department"', '"Location"', '"Vendor"', '"AssetCategory"',
    '"InventoryCategory"', '"InventoryLocation"', '"UnitOfMeasure"', '"CompanySettings"', '"Company"', '"User"'
)

$phase1 = @"
-- Phase 1: Truncate all tables (single statement, no cascade conflicts)
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

TRUNCATE TABLE 
    "ActivityLog",
    "Account", 
    "ApprovalRequest",
    "AssetTransfer",
    "AssetAssignment",
    "MaintenanceTicket",
    "MaintenanceSchedule",
    "EmployeeAssetAcknowledgementItem",
    "AssetAcknowledgement",
    "EmployeeAssetAcknowledgementBatch",
    "InventoryTransaction",
    "InventoryAssignment",
    "InventoryAdjustment",
    "InventoryBalance",
    "InventoryItem",
    "Asset",
    "Employee",
    "CompanyUser",
    "Session",
    "VerificationToken",
    "Department",
    "Location",
    "Vendor",
    "AssetCategory",
    "InventoryCategory",
    "InventoryLocation",
    "UnitOfMeasure",
    "CompanySettings",
    "Company",
    "User"
CASCADE;

"@

# Write phase 2: All inserts with FK checks disabled
$phase2Header = @"
-- Phase 2: Insert all data with FK checks disabled
SET session_replication_role = replica;

"@

$phase2Footer = @"

-- Re-enable FK checks
SET session_replication_role = DEFAULT;
"@

Write-Host "Writing phase 1 (truncate) file..."
[System.IO.File]::WriteAllText((Resolve-Path ".").Path + "\restore_phase1.sql", $phase1, [System.Text.Encoding]::UTF8)

Write-Host "Extracting insert data from fixed backup..."

# Create phase 2 from the full fixed backup - just skip TRUNCATE lines and add FK disable
$insertOnlyContent = $phase2Header + ($content -replace 'TRUNCATE TABLE "[^"]*" CASCADE;', '-- (truncate removed)') + $phase2Footer

[System.IO.File]::WriteAllText((Resolve-Path ".").Path + "\restore_phase2.sql", $insertOnlyContent, [System.Text.Encoding]::UTF8)

Write-Host "Executing Phase 1: Truncating all tables..."
$env:PGPASSWORD = "postgres"
$r1 = psql -U postgres -h localhost -p 5432 -d inventory_management -f restore_phase1.sql 2>&1
Write-Host $r1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR in Phase 1! Exit code: $LASTEXITCODE"
    exit 1
}

Write-Host ""
Write-Host "Executing Phase 2: Inserting all data..."
$r2 = psql -U postgres -h localhost -p 5432 -d inventory_management -f restore_phase2.sql 2>&1
Write-Host $r2

Write-Host ""
Write-Host "Restore completed! Exit code: $LASTEXITCODE"
