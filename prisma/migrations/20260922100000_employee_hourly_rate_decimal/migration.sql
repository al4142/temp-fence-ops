-- Employee hourly rates need 4 decimal places (for example 21.0635).
-- In-place change from DOUBLE PRECISION to DECIMAL(10, 4). Existing values,
-- including 2-decimal rates, are rounded to 4 places so they stay intact.

ALTER TABLE "Employee"
  ALTER COLUMN "hourlyRate" TYPE DECIMAL(10, 4)
  USING ROUND("hourlyRate"::numeric, 4);
