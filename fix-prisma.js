#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing Prisma client issues...\n');

// 1. Remove existing Prisma client
const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma');
if (fs.existsSync(prismaClientPath)) {
  console.log('1. Removing existing Prisma client...');
  try {
    fs.rmSync(prismaClientPath, { recursive: true, force: true });
    console.log('   ✓ Prisma client removed');
  } catch (error) {
    console.log('   ⚠ Could not remove Prisma client:', error.message);
  }
} else {
  console.log('1. No existing Prisma client found');
}

// 2. Remove Prisma client from node_modules/@prisma/client
const prismaClientModulePath = path.join(__dirname, 'node_modules', '@prisma', 'client');
if (fs.existsSync(prismaClientModulePath)) {
  console.log('2. Checking @prisma/client module...');
  const generatedPath = path.join(prismaClientModulePath, 'runtime');
  if (fs.existsSync(generatedPath)) {
    try {
      fs.rmSync(generatedPath, { recursive: true, force: true });
      console.log('   ✓ Cleared @prisma/client runtime');
    } catch (error) {
      console.log('   ⚠ Could not clear runtime:', error.message);
    }
  }
}

// 3. Generate new Prisma client
console.log('\n3. Generating new Prisma client...');

function runPrismaGenerate() {
  return new Promise((resolve, reject) => {
    const process = spawn('C:/nodejs/node.exe', [
      './node_modules/prisma/build/index.js',
      'generate'
    ], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('   ✓ Prisma client generated successfully');
        resolve();
      } else {
        console.error(`   ✗ Prisma generate failed with code ${code}`);
        reject(new Error('Prisma generate failed'));
      }
    });
  });
}

// Run the fix
runPrismaGenerate()
  .then(() => {
    console.log('\n🎉 Prisma client fixed successfully!');
    console.log('\nNow you can run the build process.');
  })
  .catch((error) => {
    console.error('\n❌ Failed to fix Prisma client:', error.message);
    console.log('\n🔍 Manual steps to try:');
    console.log('   1. Delete node_modules/.prisma folder manually');
    console.log('   2. Delete node_modules/@prisma/client folder');
    console.log('   3. Run: npm install');
    console.log('   4. Run: npx prisma generate');
    process.exit(1);
  });