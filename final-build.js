#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting comprehensive build process...\n');

function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`📦 ${description}...`);
    const childProcess = spawn(command, args, {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        BUILD_TIME: 'true'
      }
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully\n`);
        resolve();
      } else {
        console.error(`❌ ${description} failed with code ${code}\n`);
        reject(new Error(`${description} failed`));
      }
    });
  });
}

async function runBuildProcess() {
  try {
    console.log('🔧 Build Configuration:');
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log(`   Working Directory: ${__dirname}\n`);
    
    // Step 1: Generate Prisma client
    await runCommand('C:/nodejs/node.exe', [
      './node_modules/prisma/build/index.js',
      'generate'
    ], 'Generating Prisma Client');
    
    // Step 2: Run Next.js build
    await runCommand('C:/nodejs/node.exe', [
      './node_modules/next/dist/bin/next',
      'build'
    ], 'Building Next.js Application');
    
    console.log('🎉 BUILD COMPLETED SUCCESSFULLY! 🎉');
    console.log('\n📊 Build Summary:');
    console.log('   ✅ Prisma client generated');
    console.log('   ✅ Next.js application built');
    console.log('   ✅ TypeScript compiled');
    console.log('   ✅ Assets optimized');
    console.log('\n🚀 Ready for deployment!');
    
  } catch (error) {
    console.error('\n💥 BUILD FAILED! 💥');
    console.error(`Error: ${error.message}\n`);
    
    console.log('🔍 Troubleshooting Steps:');
    console.log('   1. Check TypeScript errors');
    console.log('   2. Verify environment variables');
    console.log('   3. Check database connection');
    console.log('   4. Review import statements');
    console.log('   5. Check for missing dependencies');
    
    process.exit(1);
  }
}

// Run the build process
runBuildProcess();