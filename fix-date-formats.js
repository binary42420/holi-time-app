const fs = require('fs');
const path = require('path');

console.log('🗓️ Starting date/time format standardization...\n');

// Common date format patterns to replace
const dateFormatMappings = {
  // Date formats
  "'MMM dd, yyyy'": "'M/d/yyyy'",
  "'MMMM d, yyyy'": "'M/d/yyyy'",
  "'MM/dd/yyyy'": "'M/d/yyyy'",
  "'MMM d, yyyy'": "'M/d/yyyy'",
  "'MMMM dd, yyyy'": "'M/d/yyyy'",
  
  // Time formats
  "'h:mm a'": "TIME_FORMATS.DISPLAY", // Will need to import TIME_FORMATS
  "'HH:mm'": "TIME_FORMATS.INPUT",
  
  // Combined formats
  "'MMMM d, yyyy at h:mm a'": "'M/d/yyyy at ' + TIME_FORMATS.DISPLAY",
  "'MMM d, yyyy h:mm a'": "'M/d/yyyy ' + TIME_FORMATS.DISPLAY",
};

// Pattern to find format() calls with date patterns
const formatPatterns = [
  /format\([^,]+,\s*['"`]([^'"`]*(?:MMM|yyyy|dd|MM)[^'"`]*)['"`]\)/g,
  /format\([^,]+,\s*['"`]([^'"`]*(?:h:mm|HH:mm)[^'"`]*)['"`]\)/g,
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Skip if file doesn't contain format() calls
    if (!content.includes('format(')) {
      return false;
    }
    
    // Apply direct format string replacements
    for (const [oldFormat, newFormat] of Object.entries(dateFormatMappings)) {
      if (content.includes(oldFormat)) {
        content = content.replace(new RegExp(oldFormat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newFormat);
        modified = true;
        console.log(`  📝 Replaced ${oldFormat} with ${newFormat}`);
      }
    }
    
    // Find and report other date format patterns
    formatPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          console.log(`  ⚠️  Found format pattern in ${filePath}: ${match}`);
        });
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
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
      if (!['node_modules', '.next', '.git', 'dist', 'build', 'prisma'].includes(item)) {
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
  const srcPath = path.join(__dirname, 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.error('❌ src directory not found');
    process.exit(1);
  }
  
  const fixedCount = processDirectory(srcPath);
  
  console.log(`\n🎉 Date format standardization complete! Updated ${fixedCount} files.`);
  
  console.log('\n📝 Summary of changes:');
  console.log('• Date format: M/d/yyyy (1/12/2025, 12/18/2024)');
  console.log('• Time format: h:mm a (4:00 PM, 12:45 PM)');
  console.log('• Simplified display with consistent formatting');
  
  console.log('\n🔍 Manual review needed for:');
  console.log('• Any remaining format() calls with complex patterns');
  console.log('• Import statements for TIME_FORMATS constant');
  console.log('• Testing date/time display across the app');
}

if (require.main === module) {
  main();
}
