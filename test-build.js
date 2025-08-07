#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple build test script
console.log('Testing Node.js and npm setup...');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test if we can import basic modules
try {
  console.log('✓ Basic Node.js ES modules working');
  
  // Check if package.json exists
  const packagePath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('✓ Package.json found');
    console.log('Project name:', pkg.name);
    console.log('Version:', pkg.version);
    console.log('Module type:', pkg.type);
  } else {
    console.log('✗ Package.json not found');
  }
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('✓ node_modules directory exists');
    
    // Check for critical dependencies
    const criticalDeps = ['next', '@prisma/client', 'react', 'typescript'];
    for (const dep of criticalDeps) {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        console.log(`✓ ${dep} installed`);
      } else {
        console.log(`✗ ${dep} missing`);
      }
    }
  } else {
    console.log('✗ node_modules directory missing - run npm install');
  }
  
} catch (error) {
  console.error('✗ Error testing Node.js setup:', error.message);
}