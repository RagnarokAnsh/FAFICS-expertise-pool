const { Client } = require('pg');

try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch {
  // dotenv is optional — DATABASE_URL may come from the real environment.
}

(async () => {
  const client = new Client({
    // Never hard-code credentials here: DATABASE_URL comes from the environment / .env.
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('application_nonun_experiences','application_un_experiences','application_expertise','audit_logs') ORDER BY table_name"
    );
    console.log(JSON.stringify(tables.rows));
  } finally {
    await client.end();
  }
})();
