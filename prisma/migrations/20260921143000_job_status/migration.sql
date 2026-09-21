-- Additive job status. Existing rows become Active so Install / Pickup / Drop /
-- Other / Site Walk keep today's inventory and P&L behavior.
-- Cancelled is set only on edit; create always inserts Active.

ALTER TABLE "Job" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Active';
