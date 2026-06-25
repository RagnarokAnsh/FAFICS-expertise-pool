-- Free text for the "Other" option in the position/committee preference (Step 4).
ALTER TABLE "applications"
  ADD COLUMN "preferred_committees_other" TEXT;
