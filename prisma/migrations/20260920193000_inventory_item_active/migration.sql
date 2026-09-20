-- Soft-deactivate catalog SKUs instead of hard-deleting in-use items.
-- Existing rows stay active so historical jobs keep resolving names.

ALTER TABLE "InventoryItem" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
