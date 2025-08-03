import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './db';

export async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // List of migration files in order
    const migrations = [
      '001_initial_schema.sql',
      '002_add_is_active_to_time_entries.sql',
      '003_consolidate_user_tables.sql',
      '004_restructure_client_model_and_crew_chief_permissions.sql',
      '005_add_audit_log_table.sql'
    ];

    for (const migration of migrations) {
      // Check if migration has already been run
      const result = await query(
        'SELECT id FROM migrations WHERE filename = $1',
        [migration]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${migration}`);
        
        // Read and execute migration file
        const migrationPath = join(process.cwd(), 'src', 'lib', 'migrations', migration);
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        
        // Execute migration
        await query(migrationSQL);
        
        // Record migration as completed
        await query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [migration]
        );
        
        console.log(`Migration completed: ${migration}`);
      } else {
        console.log(`Migration already run: ${migration}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Function to seed initial data
export async function seedDatabase() {
  try {
    console.log('Seeding database with initial data...');

    // Check if we already have users (to avoid duplicate seeding)
    const existingUsers = await query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

    // Create initial users (no password hashing)
    const users = [
      { email: 'alex.j@handson.com', password: 'password123', name: 'Alex Johnson', role: 'Employee' },
      { email: 'maria.g@handson.com', password: 'password123', name: 'Maria Garcia', role: 'Crew Chief' },
      { email: 'sam.c@handson.com', password: 'password123', name: 'Sam Chen', role: 'Admin' },
      { email: 'jsmith@constructo.com', password: 'password123', name: 'John Smith', role: 'Customer' },
    ];

    const userIds: Record<string, string> = {};

    for (const userData of users) {
      const result = await query(`
        INSERT INTO users (email, password_hash, name, role, avatar)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        userData.email,
        userData.password, // Store password directly (no hashing)
        userData.name,
        userData.role,
        `https://i.pravatar.cc/32?u=${userData.email}`
      ]);
      userIds[userData.email] = result.rows[0].id;
    }

    // Create clients
    const clientResult = await query(`
      INSERT INTO clients (name, address, contact_person, contact_email, contact_phone)
      VALUES
        ('Constructo Corp.', '123 Main St, Buildville', 'John Smith', 'jsmith@constructo.com', '555-1234'),
        ('EventMakers Inc.', '456 Market Ave, EventCity', 'Jane Doe', 'jdoe@eventmakers.com', '555-5678')
      RETURNING id, name
    `);

    const constructoId = clientResult.rows.find(r => r.name === 'Constructo Corp.')?.id;
    const eventMakersId = clientResult.rows.find(r => r.name === 'EventMakers Inc.')?.id;

    // Link client user to client
    if (constructoId) {
      await query('UPDATE users SET client_id = $1 WHERE email = $2', [constructoId, 'jsmith@constructo.com']);
      await query('INSERT INTO client_user_links (client_id, user_id) VALUES ($1, $2)', [constructoId, userIds['jsmith@constructo.com']]);
    }

    // Create employees for non-client users
    const employeeUsers = [
      { email: 'alex.j@handson.com', certifications: ['Forklift', 'OSHA 10'], performance: 4.5, location: 'Downtown' },
      { email: 'maria.g@handson.com', certifications: ['First Aid', 'Crew Management'], performance: 4.9, location: 'Downtown' },
      { email: 'sam.c@handson.com', certifications: ['Management', 'Safety'], performance: 4.8, location: 'Office' },
    ];

    for (const empData of employeeUsers) {
      await query(`
        INSERT INTO employees (user_id, certifications, performance, location)
        VALUES ($1, $2, $3, $4)
      `, [userIds[empData.email], empData.certifications, empData.performance, empData.location]);
    }

    // Create jobs
    let jobIds: Record<string, string> = {};
    if (constructoId && eventMakersId) {
      const jobResult = await query(`
        INSERT INTO jobs (name, client_id, description)
        VALUES
          ('Downtown Core Project', $1, 'Major construction project in the city center.'),
          ('Suburban Office Complex', $1, 'Renovation of a 3-story office building.'),
          ('City Park Festival', $2, 'Annual music and arts festival setup and teardown.')
        RETURNING id, name
      `, [constructoId, eventMakersId]);

      jobResult.rows.forEach(row => {
        jobIds[row.name] = row.id;
      });
    }

    // Create some sample shifts
    if (Object.keys(jobIds).length > 0) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await query(`
        INSERT INTO shifts (job_id, crew_chief_id, date, start_time, end_time, location, status)
        VALUES
          ($1, $2, $3, '08:00', '16:00', 'Downtown Construction Site', 'Upcoming'),
          ($4, $2, $5, '09:00', '17:00', 'Suburban Office Building', 'Upcoming')
      `, [
        jobIds['Downtown Core Project'],
        userIds['maria.g@handson.com'],
        tomorrow.toISOString().split('T')[0],
        jobIds['Suburban Office Complex'],
        today.toISOString().split('T')[0]
      ]);
    }

    // Create announcements
    await query(`
      INSERT INTO announcements (title, content, created_by)
      VALUES
        ('Welcome to the Team!', 'We are excited to have you join our workforce management system.', $1),
        ('Safety First', 'Remember to always follow safety protocols on all job sites.', $1)
    `, [userIds['sam.c@handson.com']]);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}
