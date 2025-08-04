/**
 * Update User Avatars Script
 * 
 * This script updates user avatars in the database using the base64 results
 * from the avatar conversion script.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma
const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  resultsFile: 'avatar-base64-results.json',
  dryRun: false, // Set to true to preview changes without applying them
  batchSize: 10, // Process users in batches
  backupFile: 'user-avatars-backup.json', // Backup existing avatars
};

/**
 * Create backup of existing user avatars
 */
async function createBackup() {
  console.log('📦 Creating backup of existing avatars...');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      avatarData: true,
      avatarUrl: true
    },
    where: {
      OR: [
        { avatarData: { not: null } },
        { avatarUrl: { not: null } }
      ]
    }
  });

  const backup = {
    timestamp: new Date().toISOString(),
    count: users.length,
    users: users
  };

  fs.writeFileSync(CONFIG.backupFile, JSON.stringify(backup, null, 2));
  console.log(`✅ Backup created: ${CONFIG.backupFile} (${users.length} users)`);
  
  return backup;
}

/**
 * Match conversion results with database users
 */
async function matchUsersWithResults(results) {
  console.log('🔍 Matching conversion results with database users...');
  
  const matches = [];
  const unmatched = [];
  
  for (const result of results.results) {
    if (!result.success) continue;
    
    let user = null;
    const identifier = result.identifier;
    
    if (identifier) {
      // Try to find user by various identifiers
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { id: identifier },
            { name: identifier },
            // Add more matching criteria as needed
          ]
        }
      });
    }
    
    if (user) {
      matches.push({
        user,
        result,
        updateData: {
          avatarData: result.base64,
          // Optionally keep the original URL for reference
          avatarUrl: result.url
        }
      });
    } else {
      unmatched.push(result);
    }
  }
  
  console.log(`✅ Matched: ${matches.length} users`);
  console.log(`❌ Unmatched: ${unmatched.length} results`);
  
  if (unmatched.length > 0) {
    console.log('\n🔍 Unmatched results:');
    unmatched.forEach(item => {
      console.log(`   ${item.identifier || 'No identifier'}: ${item.url}`);
    });
  }
  
  return { matches, unmatched };
}

/**
 * Update user avatars in batches
 */
async function updateUserAvatars(matches) {
  console.log(`\n🔄 Updating ${matches.length} user avatars...`);
  
  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  // Process in batches
  for (let i = 0; i < matches.length; i += CONFIG.batchSize) {
    const batch = matches.slice(i, i + CONFIG.batchSize);
    const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
    const totalBatches = Math.ceil(matches.length / CONFIG.batchSize);
    
    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} users)`);
    
    for (const match of batch) {
      try {
        const { user, updateData } = match;
        
        if (CONFIG.dryRun) {
          console.log(`   [DRY RUN] Would update ${user.email || user.name || user.id}`);
        } else {
          await prisma.user.update({
            where: { id: user.id },
            data: updateData
          });
          
          console.log(`   ✅ Updated ${user.email || user.name || user.id}`);
        }
        
        results.successful++;
      } catch (error) {
        console.log(`   ❌ Failed to update ${match.user.email || match.user.name || match.user.id}: ${error.message}`);
        results.failed++;
        results.errors.push({
          user: match.user,
          error: error.message
        });
      }
    }
    
    // Small delay between batches
    if (i + CONFIG.batchSize < matches.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Verify updates were applied correctly
 */
async function verifyUpdates(matches) {
  console.log('\n🔍 Verifying updates...');
  
  let verified = 0;
  let failed = 0;
  
  for (const match of matches) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: match.user.id },
        select: { id: true, email: true, avatarData: true }
      });
      
      if (user && user.avatarData && user.avatarData.startsWith('data:image/')) {
        verified++;
      } else {
        failed++;
        console.log(`   ❌ Verification failed for ${match.user.email || match.user.id}`);
      }
    } catch (error) {
      failed++;
      console.log(`   ❌ Error verifying ${match.user.email || match.user.id}: ${error.message}`);
    }
  }
  
  console.log(`✅ Verified: ${verified} users`);
  console.log(`❌ Failed verification: ${failed} users`);
  
  return { verified, failed };
}

/**
 * Main execution function
 */
async function main() {
  console.log('👤 User Avatar Update Script');
  console.log('============================');
  
  const resultsPath = path.resolve(CONFIG.resultsFile);
  
  // Check if results file exists
  if (!fs.existsSync(resultsPath)) {
    console.error(`❌ Results file not found: ${resultsPath}`);
    console.log('\nRun the avatar conversion script first to generate the results file.');
    return;
  }

  try {
    // Load conversion results
    console.log(`📁 Loading conversion results: ${resultsPath}`);
    const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    if (!resultsData.results || resultsData.results.length === 0) {
      console.error('❌ No results found in the results file');
      return;
    }
    
    const successfulResults = resultsData.results.filter(r => r.success);
    console.log(`📊 Found ${successfulResults.length} successful conversions out of ${resultsData.results.length} total`);
    
    if (successfulResults.length === 0) {
      console.error('❌ No successful conversions found');
      return;
    }

    // Create backup
    await createBackup();
    
    // Match results with users
    const { matches, unmatched } = await matchUsersWithResults(resultsData);
    
    if (matches.length === 0) {
      console.error('❌ No users matched with conversion results');
      console.log('\nTips for better matching:');
      console.log('- Ensure identifiers in your input file match user emails, IDs, or names');
      console.log('- Check the database for existing users');
      return;
    }
    
    // Show preview
    console.log('\n📋 Update Preview:');
    matches.slice(0, 5).forEach(match => {
      const user = match.user;
      const size = Math.round(match.result.size / 1024);
      console.log(`   ${user.email || user.name || user.id} → ${size}KB ${match.result.contentType}`);
    });
    
    if (matches.length > 5) {
      console.log(`   ... and ${matches.length - 5} more users`);
    }
    
    // Confirm before proceeding (unless dry run)
    if (!CONFIG.dryRun) {
      console.log('\n⚠️  This will update user avatars in the database.');
      console.log('   A backup has been created, but please ensure you have a full database backup.');
      console.log('\n   Set CONFIG.dryRun = true to preview changes without applying them.');
      
      // In a real scenario, you might want to add a confirmation prompt here
      // For now, we'll proceed automatically
    }
    
    // Update avatars
    const startTime = Date.now();
    const updateResults = await updateUserAvatars(matches);
    const endTime = Date.now();
    
    // Verify updates (only if not dry run)
    let verificationResults = null;
    if (!CONFIG.dryRun) {
      verificationResults = await verifyUpdates(matches);
    }
    
    // Final summary
    console.log('\n📊 Final Summary:');
    console.log(`✅ Successful updates: ${updateResults.successful}`);
    console.log(`❌ Failed updates: ${updateResults.failed}`);
    
    if (verificationResults) {
      console.log(`✅ Verified updates: ${verificationResults.verified}`);
      console.log(`❌ Failed verification: ${verificationResults.failed}`);
    }
    
    console.log(`⏱️  Processing time: ${((endTime - startTime) / 1000).toFixed(1)}s`);
    
    if (updateResults.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      updateResults.errors.forEach(error => {
        console.log(`   ${error.user.email || error.user.id}: ${error.error}`);
      });
    }
    
    console.log(`\n💾 Backup file: ${CONFIG.backupFile}`);
    console.log('\n🎉 Avatar update process complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Command line options
if (process.argv.includes('--dry-run')) {
  CONFIG.dryRun = true;
}

if (process.argv.includes('--help')) {
  console.log('User Avatar Update Script');
  console.log('========================');
  console.log('');
  console.log('Usage: node update-user-avatars.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run    Preview changes without applying them');
  console.log('  --help       Show this help message');
  console.log('');
  console.log('Configuration (edit script to change):');
  console.log(`  Results file: ${CONFIG.resultsFile}`);
  console.log(`  Batch size: ${CONFIG.batchSize}`);
  console.log(`  Backup file: ${CONFIG.backupFile}`);
  process.exit(0);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { createBackup, matchUsersWithResults, updateUserAvatars, verifyUpdates };