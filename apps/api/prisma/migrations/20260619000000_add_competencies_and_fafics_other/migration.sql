-- Widen FAFICS area_of_contribution (now stores one or more '; '-joined
-- committee names via multi-select) and add a free-text "Other" column.
ALTER TABLE "application_fafics_experiences"
  ALTER COLUMN "area_of_contribution" TYPE TEXT,
  ADD COLUMN "area_of_contribution_other" TEXT;

-- Top-5 core competencies (client feedback).
ALTER TABLE "applications"
  ADD COLUMN "competencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
