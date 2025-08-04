/**
 * Fix Base64 Format Script
 * 
 * Fixes base64 strings that have the wrong format (semicolon instead of comma)
 */

const fs = require('fs');

function fixBase64Format(base64String) {
  // Check if it has the wrong format
  if (base64String.includes('base64/')) {
    // Replace 'base64/' with 'base64,'
    return base64String.replace('base64/', 'base64,');
  }
  return base64String;
}

function fixBase64File(inputFile, outputFile) {
  try {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    // Fix each result
    if (data.results) {
      data.results.forEach(result => {
        if (result.base64) {
          result.base64 = fixBase64Format(result.base64);
        }
      });
    }
    
    // Save fixed data
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`✅ Fixed base64 format in ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example usage
const wrongFormat = "data:image/jpeg;base64/9j/4AAQSkZJRgABAQAAAQABAAD/...";
const correctFormat = fixBase64Format(wrongFormat);

console.log('Wrong format:  ', wrongFormat.substring(0, 30) + '...');
console.log('Correct format:', correctFormat.substring(0, 30) + '...');

// If you have a results file to fix:
// fixBase64File('avatar-base64-results.json', 'avatar-base64-results-fixed.json');

module.exports = { fixBase64Format, fixBase64File };