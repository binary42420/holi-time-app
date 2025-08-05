#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Dependency analysis
const analysis = {
  potentiallyUnused: [],
  heavyDependencies: [],
  duplicateFunctionality: [],
  recommendations: []
};

// Check for potentially unused dependencies
const potentiallyUnused = [
  'dotenv', // Next.js handles env vars
  'dotenv-cli', // Not needed in production
  'eslint-plugin-jest', // Should be in devDependencies
  'autoprefixer', // Next.js includes this
  'postcss', // Next.js includes this
  'postcss-import', // May not be needed
  'postcss-preset-mantine', // Check if actually used
];

// Check for heavy dependencies that could be replaced
const heavyDependencies = [
  {
    name: 'react-beautiful-dnd',
    size: '~200KB',
    alternative: '@dnd-kit/core + @dnd-kit/sortable',
    reason: 'Lighter and more modern drag-and-drop library'
  },
  {
    name: 'recharts',
    size: '~400KB',
    alternative: 'chart.js or lightweight charting library',
    reason: 'Very heavy for simple charts'
  },
  {
    name: 'exceljs',
    size: '~300KB',
    alternative: 'xlsx (already included)',
    reason: 'Duplicate functionality with xlsx'
  },
  {
    name: 'react-pdf',
    size: '~500KB',
    alternative: 'Dynamic import when needed',
    reason: 'Very heavy, should be code-split'
  },
  {
    name: 'jspdf + jspdf-autotable',
    size: '~200KB',
    alternative: 'pdf-lib (already included)',
    reason: 'Duplicate PDF functionality'
  },
  {
    name: 'pdfkit',
    size: '~150KB',
    alternative: 'pdf-lib (already included)',
    reason: 'Third PDF library - consolidate to one'
  }
];

// Check for duplicate functionality
const duplicates = [
  {
    group: 'PDF Libraries',
    packages: ['jspdf', 'jspdf-autotable', 'pdf-lib', 'pdfkit', 'react-pdf'],
    recommendation: 'Choose one PDF library and remove others'
  },
  {
    group: 'Excel Libraries',
    packages: ['exceljs', 'xlsx'],
    recommendation: 'xlsx is lighter, consider removing exceljs'
  },
  {
    group: 'Toast Notifications',
    packages: ['react-toastify', 'sonner'],
    recommendation: 'Choose one toast library'
  },
  {
    group: 'HTTP Clients',
    packages: ['node-fetch'],
    recommendation: 'Use native fetch API instead'
  }
];

// Analyze current dependencies
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

console.log('🔍 Dependency Analysis Report\n');

// Check for potentially unused
console.log('📦 Potentially Unused Dependencies:');
potentiallyUnused.forEach(dep => {
  if (dependencies[dep]) {
    analysis.potentiallyUnused.push(dep);
    console.log(`  ❌ ${dep} - Consider removing`);
  }
});

if (analysis.potentiallyUnused.length === 0) {
  console.log('  ✅ No obviously unused dependencies found');
}

console.log('\n🏋️ Heavy Dependencies:');
heavyDependencies.forEach(({ name, size, alternative, reason }) => {
  if (dependencies[name]) {
    analysis.heavyDependencies.push({ name, size, alternative, reason });
    console.log(`  ⚠️  ${name} (${size}) - ${reason}`);
    console.log(`     💡 Consider: ${alternative}`);
  }
});

console.log('\n🔄 Duplicate Functionality:');
duplicates.forEach(({ group, packages, recommendation }) => {
  const found = packages.filter(pkg => dependencies[pkg]);
  if (found.length > 1) {
    analysis.duplicateFunctionality.push({ group, packages: found, recommendation });
    console.log(`  🔄 ${group}: ${found.join(', ')}`);
    console.log(`     💡 ${recommendation}`);
  }
});

console.log('\n📊 Bundle Size Optimization Recommendations:');

// Generate specific recommendations
const recommendations = [
  'Move development-only packages to devDependencies',
  'Consider dynamic imports for heavy libraries (PDF, charts)',
  'Consolidate duplicate functionality',
  'Use tree-shakable alternatives where possible',
  'Implement code splitting for heavy features'
];

recommendations.forEach((rec, index) => {
  console.log(`  ${index + 1}. ${rec}`);
});

// Generate optimized package.json suggestions
console.log('\n🛠️ Suggested Package.json Optimizations:');

const optimizations = {
  remove: [
    'dotenv', // Next.js handles this
    'dotenv-cli', // Not needed
    'autoprefixer', // Included in Next.js
    'postcss', // Included in Next.js
    'node-fetch', // Use native fetch
  ],
  moveToDevDependencies: [
    'eslint-plugin-jest',
    '@types/node-fetch',
    '@types/pdfkit',
    '@types/pusher-js',
    '@types/react-beautiful-dnd',
  ],
  consider: [
    'Replace react-beautiful-dnd with @dnd-kit/core',
    'Consolidate PDF libraries to one (recommend pdf-lib)',
    'Choose one toast library (recommend sonner)',
    'Dynamic import heavy libraries like recharts and react-pdf'
  ]
};

console.log('\n📝 To Remove:');
optimizations.remove.forEach(pkg => {
  if (dependencies[pkg]) {
    console.log(`  npm uninstall ${pkg}`);
  }
});

console.log('\n📝 Move to devDependencies:');
optimizations.moveToDevDependencies.forEach(pkg => {
  if (packageJson.dependencies[pkg]) {
    console.log(`  Move ${pkg} to devDependencies`);
  }
});

console.log('\n📝 Consider:');
optimizations.consider.forEach(suggestion => {
  console.log(`  - ${suggestion}`);
});

// Calculate potential savings
const potentialSavings = analysis.heavyDependencies.reduce((total, dep) => {
  const sizeMatch = dep.size.match(/(\d+)/);
  return total + (sizeMatch ? parseInt(sizeMatch[1]) : 0);
}, 0);

console.log(`\n💾 Potential bundle size reduction: ~${potentialSavings}KB`);

// Write analysis to file
const reportPath = path.join(__dirname, '..', 'dependency-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify({
  analysis,
  optimizations,
  potentialSavings: `${potentialSavings}KB`,
  timestamp: new Date().toISOString()
}, null, 2));

console.log(`\n📄 Detailed report saved to: ${reportPath}`);