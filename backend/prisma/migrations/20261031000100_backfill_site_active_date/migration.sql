-- Backfill the activation (period start) date for existing sites from their
-- most recent recorded payment, so the new field is populated for historical data.
UPDATE "Site" s
SET "activeDate" = p."latestPaymentDate"
FROM (
  SELECT "siteId", MAX("paymentDate") AS "latestPaymentDate"
  FROM "Payment"
  WHERE "siteId" IS NOT NULL
  GROUP BY "siteId"
) p
WHERE s."id" = p."siteId"
  AND s."activeDate" IS NULL;
