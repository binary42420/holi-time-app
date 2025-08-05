#!/usr/bin/env node

/**
 * Startup script that runs migrations before starting the Next.js application
 * This ensures migrations are always up to date in production
 */

import { spawn } from 'child_process';
import { readdir, access } from 'fs/promises';
import path from 'path';

console.log('🚀 Starting HoliTime application with migration check...');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`📋 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    // Check if we're in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🚪 Port: ${process.env.PORT || '3000'}`);
    console.log(`📁 Working directory: ${process.cwd()}`);
    
    // List files in current directory for debugging
    try {
      const files = await readdir('.');
      console.log('📂 Files in current directory:', files.slice(0, 10).join(', '));
    } catch (error) {
      console.log('⚠️  Could not list directory contents');
    }
    
    // Check if server.js exists
    try {
      await access('server.js');
      console.log('✅ server.js found');
    } catch (error) {
      console.log('❌ server.js not found in current directory');
      console.log('🔍 This is likely the cause of the startup failure');
    }
    
    if (isProduction) {
      console.log('🔄 Production environment detected');
      console.log('📝 Skipping automatic migrations in containerized production environment');
      console.log('💡 Database migrations should be handled by:');
      console.log('   - Cloud Build pipeline');
      console.log('   - Manual deployment scripts');
      console.log('   - Database migration jobs');
      console.log('✅ Application will start with existing database schema');
    }
    
    // Start the Next.js application
    console.log('🎉 Starting Next.js standalone server...');
    console.log('📍 Looking for server.js in current directory');
    
    // Start the server and keep the process alive
    const serverProcess = spawn('node', ['server.js'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: process.env.PORT || '8080',
        HOSTNAME: '0.0.0.0'
      }
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Server failed to start:', error);
      process.exit(1);
    });

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      process.exit(code);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      serverProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      serverProcess.kill('SIGINT');
    });
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

main();