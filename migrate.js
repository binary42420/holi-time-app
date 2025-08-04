#!/usr/bin/env node

// Migration script for Cloud Run deployment
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Starting database migration...');
console.log('Working directory:', process.cwd());
console.log('Script directory:', __dirname);

// Set working directory to ensure we're in the right place
process.chdir(__dirname);

// Determine the correct command based on platform
const isWindows = process.platform === 'win32';
const command = isWindows ? 'npx.cmd' : 'npx';
const args = ['prisma', 'migrate', 'deploy'];

console.log(`Running: ${command} ${args.join(' ')}`);

// Run Prisma migration
const migration = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // Ensure Prisma can find the schema
    PRISMA_SCHEMA_PATH: './prisma/schema.prisma'
  }
});

migration.on('error', (error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

migration.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Migration completed successfully');
  } else {
    console.error(`❌ Migration failed with exit code ${code}`);
  }
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping migration...');
  migration.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping migration...');
  migration.kill('SIGINT');
});