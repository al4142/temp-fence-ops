-- Optional free-text site contacts on Job (name and phone in one string).
-- Empty stays NULL. Existing rows are unchanged.

ALTER TABLE "Job" ADD COLUMN "contact1" TEXT;
ALTER TABLE "Job" ADD COLUMN "contact2" TEXT;
