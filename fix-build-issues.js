#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing build issues...\n');

// 1. Check Node.js and dependencies
console.log('1. Checking Node.js setup...');
console.log(`   Node version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);

// 2. Verify critical dependencies
const criticalDeps = ['next', '@prisma/client', 'react', 'typescript'];
const nodeModulesPath = path.join(__dirname, 'node_modules');

console.log('\n2. Checking dependencies...');
for (const dep of criticalDeps) {
  const depPath = path.join(nodeModulesPath, dep);
  if (fs.existsSync(depPath)) {
    console.log(`   ✓ ${dep} installed`);
  } else {
    console.log(`   ✗ ${dep} missing`);
  }
}

// 3. Check environment files
console.log('\n3. Checking environment configuration...');
const envFiles = ['.env.development', '.env.production'];
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    console.log(`   ✓ ${envFile} exists`);
  } else {
    console.log(`   ✗ ${envFile} missing`);
  }
}

// 4. Check Prisma schema
console.log('\n4. Checking Prisma configuration...');
const prismaSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
if (fs.existsSync(prismaSchemaPath)) {
  console.log('   ✓ Prisma schema exists');
} else {
  console.log('   ✗ Prisma schema missing');
}

// 5. Check for common build-breaking files
console.log('\n5. Checking for potential build issues...');
const criticalFiles = [
  'src/app/layout.tsx',
  'src/lib/prisma.ts',
  'src/lib/types.ts',
  'next.config.mjs',
  'tsconfig.json'
];

for (const file of criticalFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${file} exists`);
  } else {
    console.log(`   ✗ ${file} missing`);
  }
}

// 6. Run build process
console.log('\n6. Starting build process...');

function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`   Running: ${description}`);
    const process = spawn(command, args, {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`   ✓ ${description} completed`);
        resolve();
      } else {
        console.error(`   ✗ ${description} failed with code ${code}`);
        reject(new Error(`${description} failed`));
      }
    });
  });
}

async function runBuildProcess() {
  try {
    // Step 1: Generate Prisma client
    await runCommand('C:/nodejs/node.exe', [
      './node_modules/prisma/build/index.js',
      'generate'
    ], 'Prisma generate');
    
    // Step 2: Run Next.js build
    await runCommand('C:/nodejs/node.exe', [
      './node_modules/next/dist/bin/next',
      'build'
    ], 'Next.js build');
    
    console.log('\n🎉 Build completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.log('\n🔍 Common solutions:');
    console.log('   1. Run: npm install');
    console.log('   2. Check environment variables');
    console.log('   3. Fix TypeScript errors');
    console.log('   4. Check database connection');
    process.exit(1);
  }
}

// Run the build process
runBuildProcess();