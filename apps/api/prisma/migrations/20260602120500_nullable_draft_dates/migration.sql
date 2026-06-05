-- Allow date_of_birth and separation_date to be NULL so drafts that haven't
-- captured them yet don't have to store a misleading placeholder ("today").
-- These are still required at submission time (enforced in the service layer).

ALTER TABLE "applications" ALTER COLUMN "date_of_birth" DROP NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "separation_date" DROP NOT NULL;
