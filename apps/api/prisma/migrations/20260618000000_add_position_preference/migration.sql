-- AlterTable: position / committee preference (client feedback)
ALTER TABLE "applications"
  ADD COLUMN "preferred_committees" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "position_preference_rationale" TEXT;
