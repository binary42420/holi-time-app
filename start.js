#!/usr/bin/env node

// Startup script for Cloud Run with Next.js standalone
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`🚀 Starting Holitime app on ${hostname}:${port}...`);
console.log(`Environment: ${process.env.NODE_ENV}`);

// For production, use the standalone server
if (!dev) {
  const standaloneServerPath = path.join(__dirname, '.next', 'standalone', 'server.js');
  
  console.log(`Starting standalone server from: ${standaloneServerPath}`);
  
  // Start the standalone server
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
    console.error('❌ Failed to start standalone server:', error);
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
  // Development mode - use regular Next.js server
  const { createServer } = await import('http');
  const { parse } = await import('url');
  const next = (await import('next')).default;
  
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
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
  });
}