#!/usr/bin/env node

// Startup script that runs migrations then starts the server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log('🚀 Starting Holitime app with migration...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${port}`);

async function runMigration() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Running database migration...');
    
    const command = 'npx';
    const args = ['prisma', 'migrate', 'deploy'];
    
    const migration = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        PRISMA_SCHEMA_PATH: './prisma/schema.prisma'
      }
    });

    migration.on('error', (error) => {
      console.error('❌ Migration failed:', error);
      reject(error);
    });

    migration.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Migration completed successfully');
        resolve();
      } else {
        console.error(`❌ Migration failed with exit code ${code}`);
        reject(new Error(`Migration failed with exit code ${code}`));
      }
    });
  });
}

async function startServer() {
  console.log('🚀 Starting application server...');
  
  if (!dev) {
    // Production: use standalone server
    const standaloneServerPath = path.join(__dirname, 'server.js');
    console.log(`Starting standalone server from: ${standaloneServerPath}`);
    
    const server = spawn('node', [standaloneServerPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port,
        HOSTNAME: hostname,
        NODE_ENV: 'production'
      }
    });

    server.on('error', (error) => {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    });

    server.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      process.exit(code);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      server.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      server.kill('SIGINT');
    });
  } else {
    // Development: use Next.js dev server
    const { createServer } = await import('http');
    const { parse } = await import('url');
    const next = (await import('next')).default;
    
    const app = next({ dev, hostname, port });
    const handle = app.getRequestHandler();

    await app.prepare();
    
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`✅ Ready on http://${hostname}:${port}`);
    });
  }
}

// Main execution
async function main() {
  try {
    // Only run migrations in production
    if (!dev) {
      await runMigration();
    }
    await startServer();
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

main();