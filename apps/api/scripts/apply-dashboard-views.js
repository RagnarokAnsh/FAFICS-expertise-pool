const { Client } = require('pg');

try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch {
  // dotenv is optional — DATABASE_URL may come from the real environment.
}

const sql = `
CREATE OR REPLACE VIEW public.vw_active_roster AS
SELECT
  a.id, a.reference_number, a.uid_number,
  a.first_name, a.last_name, a.nationality, a.second_nationality,
  a.gender, a.email, a.phone,
  a.association_name, a.association_country,
  a.separation_date, a.approved_at, a.expires_at,
  ARRAY(
    SELECT ae.area_label FROM public.application_expertise ae
    WHERE ae.application_id = a.id AND ae.is_preferred = true
    ORDER BY ae.sort_order
  ) AS preferred_areas,
  ARRAY(
    SELECT al.language || ' (' || al.proficiency || ')'
    FROM public.application_languages al
    WHERE al.application_id = a.id
    ORDER BY al.sort_order
  ) AS languages,
  ARRAY(
    SELECT ae.area_label FROM public.application_expertise ae
    WHERE ae.application_id = a.id AND ae.expertise_level = 'expert'
    ORDER BY ae.sort_order
  ) AS expert_areas
FROM public.applications a
WHERE a.status = 'approved';

CREATE OR REPLACE VIEW public.vw_dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'submitted') AS pending_endorsement,
  COUNT(*) FILTER (WHERE status = 'endorsed') AS pending_review,
  COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
  COUNT(*) FILTER (WHERE status = 'approved') AS active_in_pool,
  COUNT(*) FILTER (WHERE status = 'changes_requested') AS changes_requested,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired,
  COUNT(*) FILTER (WHERE status = 'draft') AS drafts,
  COUNT(*) FILTER (
    WHERE status = 'approved'
      AND expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  ) AS expiring_in_90_days
FROM public.applications;
`;

(async () => {
  const client = new Client({
    // Never hard-code credentials here: DATABASE_URL comes from the environment / .env.
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    await client.query(sql);
    const result = await client.query('SELECT * FROM public.vw_dashboard_stats LIMIT 1');
    console.log(JSON.stringify(result.rows[0] ?? null));
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
