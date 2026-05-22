-- Fix: Create an IMMUTABLE wrapper for unaccent so it can be used in index expressions
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent($1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Re-create the FTS index using the immutable wrapper
DROP INDEX IF EXISTS idx_applications_fts;
CREATE INDEX idx_applications_fts ON applications USING gin(
  to_tsvector('english',
    immutable_unaccent(first_name || ' ' || last_name || ' ' ||
             association_name || ' ' || association_country)
  )
);
