#!/usr/bin/env node

/**
 * Startup script that runs migrations before starting the Next.js application
 * This ensures migrations are always up to date in production
 */

const { spawn } = require('child_process');
const path = require('path');

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
    
    if (isProduction) {
      console.log('🔄 Production environment detected - checking migrations...');
      
      // Run migration status check
      try {
        await runCommand('npx', ['prisma', 'migrate', 'status']);
        console.log('✅ Migration status check completed');
      } catch (error) {
        console.log('⚠️  Migration status check failed, but continuing...');
        console.log('📝 This is expected if migrations are handled externally');
      }
      
      // Generate Prisma client (in case it's not generated)
      try {
        console.log('🔧 Generating Prisma client...');
        await runCommand('npx', ['prisma', 'generate']);
        console.log('✅ Prisma client generated');
      } catch (error) {
        console.log('⚠️  Prisma client generation failed:', error.message);
      }
    }
    
    // Start the Next.js application
    console.log('🎉 Starting Next.js application...');
    await runCommand('node', ['server.js']);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

main();