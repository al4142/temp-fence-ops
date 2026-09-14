-- Wave 1: vendors, cost line items, yard expenses, transfers, write-offs, material variances
-- Legacy Job.lodging / freight / misc remain as denormalized sums of their line tables.

CREATE TABLE "JobLodgingLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "facility" TEXT,
    "notes" TEXT,
    CONSTRAINT "JobLodgingLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "JobFreightLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "company" TEXT,
    "cost" REAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "JobFreightLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "JobMiscLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    CONSTRAINT "JobMiscLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "JobMaterialVariance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "itemName" TEXT,
    "quantity" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "JobMaterialVariance_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobMaterialVariance_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "YardExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "branchId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vendorId" TEXT,
    "vendorText" TEXT,
    "amount" REAL NOT NULL,
    "purchasedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "YardExpense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "YardExpense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transfer_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "TransferLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "fromInventoryItemId" TEXT NOT NULL,
    "toInventoryItemId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "TransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransferLine_fromInventoryItemId_fkey" FOREIGN KEY ("fromInventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferLine_toInventoryItemId_fkey" FOREIGN KEY ("toInventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "WriteOff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "branchId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WriteOff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WriteOff_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Seed cost lines from any existing denormalized amounts (idempotent-ish for first deploy)
INSERT INTO "JobLodgingLine" ("id", "jobId", "amount", "facility", "notes")
SELECT lower(hex(randomblob(16))), "id", "lodging", NULL, 'Migrated from lodging total'
FROM "Job" WHERE "lodging" IS NOT NULL AND "lodging" != 0;

INSERT INTO "JobFreightLine" ("id", "jobId", "company", "cost", "notes")
SELECT lower(hex(randomblob(16))), "id", NULL, "freight", 'Migrated from freight total'
FROM "Job" WHERE "freight" IS NOT NULL AND "freight" != 0;

INSERT INTO "JobMiscLine" ("id", "jobId", "amount", "category", "notes")
SELECT lower(hex(randomblob(16))), "id", "misc", NULL, 'Migrated from misc total'
FROM "Job" WHERE "misc" IS NOT NULL AND "misc" != 0;

CREATE INDEX "YardExpense_date_idx" ON "YardExpense"("date");
CREATE INDEX "YardExpense_branchId_idx" ON "YardExpense"("branchId");
CREATE INDEX "Transfer_date_idx" ON "Transfer"("date");
CREATE INDEX "WriteOff_date_idx" ON "WriteOff"("date");
CREATE INDEX "WriteOff_branchId_idx" ON "WriteOff"("branchId");
