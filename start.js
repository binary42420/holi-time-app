#!/usr/bin/env node

// Simple startup script for Cloud Run
const { spawn } = require('child_process');

// Set the port from environment variable
const port = process.env.PORT || 3000;
process.env.PORT = port;

console.log(`🚀 Starting Holitime app on port ${port}...`);

// Start the Next.js server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: '0.0.0.0'
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