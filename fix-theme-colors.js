#!/usr/bin/env node

/**
 * Script to fix hardcoded dark theme colors throughout the application
 * Replaces hardcoded gray colors with semantic theme variables
 */

const fs = require('fs');
const path = require('path');

// Color mappings from hardcoded to semantic
const colorMappings = {
  // Background colors
  'bg-gray-900': 'bg-background',
  'bg-gray-800': 'bg-card',
  'bg-gray-700': 'bg-muted',
  'bg-gray-600': 'bg-muted',
  'bg-gray-100': 'bg-muted',
  'bg-gray-50': 'bg-background',
  
  // Text colors
  'text-gray-100': 'text-foreground',
  'text-gray-200': 'text-foreground',
  'text-gray-300': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-700': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-gray-900': 'text-foreground',
  'text-white': 'text-foreground',
  
  // Border colors
  'border-gray-700': 'border',
  'border-gray-600': 'border',
  'border-gray-500': 'border',
  'border-gray-400': 'border',
  'border-gray-300': 'border',
  'border-gray-200': 'border',
  
  // Specific hardcoded colors
  'bg-indigo-600': 'bg-primary',
  'hover:bg-indigo-700': 'hover:bg-primary/90',
  'bg-indigo-500': 'bg-primary',
  'text-indigo-400': 'text-primary',
  'text-indigo-500': 'text-primary',
  'text-indigo-600': 'text-primary',
  
  // Container backgrounds
  'min-h-screen bg-gray-900 text-gray-100': 'min-h-screen bg-background text-foreground',
  'bg-gray-800/50': 'bg-card/50',
  'bg-gray-900/50': 'bg-muted/50',
  'bg-gray-900/20': 'bg-muted/20',
};

// Additional patterns to replace
const patternMappings = [
  {
    pattern: /className="min-h-screen bg-gray-900 text-gray-100"/g,
    replacement: 'className="min-h-screen bg-background text-foreground"'
  },
  {
    pattern: /className="([^"]*?)bg-gray-800([^"]*?)"/g,
    replacement: (match, before, after) => `className="${before}bg-card${after}"`
  },
  {
    pattern: /className="([^"]*?)text-white([^"]*?)"/g,
    replacement: (match, before, after) => `className="${before}text-foreground${after}"`
  }
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply direct mappings
    for (const [oldColor, newColor] of Object.entries(colorMappings)) {
      const regex = new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(oldColor)) {
        content = content.replace(regex, newColor);
        modified = true;
      }
    }
    
    // Apply pattern mappings
    for (const { pattern, replacement } of patternMappings) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const items = fs.readdirSync(dirPath);
  let totalFixed = 0;
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(item)) {
        totalFixed += processDirectory(fullPath, extensions);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath);
      if (extensions.includes(ext)) {
        if (processFile(fullPath)) {
          totalFixed++;
        }
      }
    }
  }
  
  return totalFixed;
}

// Main execution
function main() {
  console.log('🎨 Starting theme color fix...\n');
  
  const srcPath = path.join(__dirname, 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.error('❌ src directory not found');
    process.exit(1);
  }
  
  const fixedCount = processDirectory(srcPath);
  
  console.log(`\n🎉 Theme fix complete! Fixed ${fixedCount} files.`);
  
  // Additional manual fixes that might be needed
  console.log('\n📝 Manual fixes that might be needed:');
  console.log('1. Check for any remaining hardcoded colors in CSS files');
  console.log('2. Verify component-specific styling is working correctly');
  console.log('3. Test both light and dark themes');
  console.log('4. Check for any custom color utilities that need updating');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, processDirectory, colorMappings };