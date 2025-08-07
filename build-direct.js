#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Next.js build with direct Node.js path...');

// First run Prisma generate
console.log('Running Prisma generate...');
const prismaGenerate = spawn('C:/nodejs/node.exe', [
  './node_modules/prisma/build/index.js',
  'generate'
], {
  cwd: __dirname,
  stdio: 'inherit'
});

prismaGenerate.on('close', (code) => {
  if (code !== 0) {
    console.error(`Prisma generate failed with code ${code}`);
    process.exit(1);
  }
  
  console.log('Prisma generate completed. Starting Next.js build...');
  
  // Then run Next.js build
  const nextBuild = spawn('C:/nodejs/node.exe', [
    './node_modules/next/dist/bin/next',
    'build'
  ], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  nextBuild.on('close', (buildCode) => {
    if (buildCode === 0) {
      console.log('✓ Build completed successfully!');
    } else {
      console.error(`✗ Build failed with code ${buildCode}`);
      process.exit(buildCode);
    }
  });
});