-- Prisma cannot express conditional integrity rules and partial indexes.
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_allocation_target_check"
  CHECK (
    ("allocationTarget" = 'POND_CROP' AND "pondId" IS NOT NULL AND "commonPoolId" IS NULL)
    OR
    ("allocationTarget" = 'COMMON' AND "commonPoolId" IS NOT NULL AND "pondId" IS NULL)
  );

CREATE UNIQUE INDEX "FeedLog_active_duplicate_prevention"
  ON "FeedLog" ("cropId", "logDate", "mealSlot", "feedItemId")
  WHERE "voidedAt" IS NULL;
