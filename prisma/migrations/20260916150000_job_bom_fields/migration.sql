-- Job BOM generator inputs (canonical fence types + rail / weight / gate / terminal options).
-- `gates` remains the denormalized total of gateQty + gateQty2. `screen` stays in sync with screenSku.

ALTER TABLE "Job" ADD COLUMN "screenSku" TEXT;
ALTER TABLE "Job" ADD COLUMN "gateType" TEXT;
ALTER TABLE "Job" ADD COLUMN "gateQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "gateType2" TEXT;
ALTER TABLE "Job" ADD COLUMN "gateQty2" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "topRail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "bottomRail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "weightMode" TEXT;
ALTER TABLE "Job" ADD COLUMN "terminalsManual" INTEGER NOT NULL DEFAULT 0;
