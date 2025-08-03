import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  console.log('Start fixing jobs...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Find or create a default company
    let companyResult = await client.query('SELECT id FROM companies WHERE name = $1', ['Default Company']);
    let defaultCompanyId: string;

    if (companyResult.rows.length === 0) {
      console.log('Creating "Default Company"...');
      const newCompanyResult = await client.query(
        'INSERT INTO companies (id, name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4) RETURNING id',
        [crypto.randomUUID(), 'Default Company', new Date(), new Date()]
      );
      defaultCompanyId = newCompanyResult.rows[0].id;
      console.log('Created "Default Company" with id:', defaultCompanyId);
    } else {
      defaultCompanyId = companyResult.rows[0].id;
      console.log('Found "Default Company" with id:', defaultCompanyId);
    }

    // 2. Find jobs with null companyId
    const jobsToFixResult = await client.query('SELECT id FROM jobs WHERE "companyId" IS NULL');
    const jobsToFix = jobsToFixResult.rows;

    if (jobsToFix.length === 0) {
      console.log('No jobs to fix.');
    } else {
      console.log(`Found ${jobsToFix.length} jobs to fix.`);
      // 3. Update jobs with the default companyId
      for (const job of jobsToFix) {
        await client.query('UPDATE jobs SET "companyId" = $1 WHERE id = $2', [defaultCompanyId, job.id]);
        console.log(`Fixed job with id: ${job.id}`);
      }
    }

    await client.query('COMMIT');
    console.log('Fixing jobs finished successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Fixing jobs failed. Rolled back changes.', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();