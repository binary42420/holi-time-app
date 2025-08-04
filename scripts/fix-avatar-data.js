import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Expected format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
const VALID_DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/;

// Common issues we might encounter:
// 1. Missing data: prefix
// 2. Wrong MIME type
// 3. Invalid base64 encoding
// 4. Corrupted data

async function analyzeAvatarData() {
  console.log('🔍 Analyzing avatar data in the database...\n');
  
  const users = await prisma.user.findMany({
    where: {
      avatarData: {
        not: null
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarData: true
    }
  });

  console.log(`Found ${users.length} users with avatar data\n`);

  const analysis = {
    total: users.length,
    valid: 0,
    invalid: 0,
    issues: {
      missingDataPrefix: 0,
      invalidMimeType: 0,
      invalidBase64: 0,
      tooShort: 0,
      nullOrEmpty: 0,
      other: 0
    },
    users: []
  };

  for (const user of users) {
    const avatarData = user.avatarData;
    const userAnalysis = {
      id: user.id,
      name: user.name,
      email: user.email,
      originalLength: avatarData?.length || 0,
      issues: [],
      isValid: false,
      canFix: false
    };

    if (!avatarData || avatarData === 'null' || avatarData === '<null>' || avatarData.trim() === '') {
      userAnalysis.issues.push('NULL_OR_EMPTY');
      analysis.issues.nullOrEmpty++;
    } else if (avatarData.length < 100) {
      userAnalysis.issues.push('TOO_SHORT');
      analysis.issues.tooShort++;
    } else if (!avatarData.startsWith('data:')) {
      userAnalysis.issues.push('MISSING_DATA_PREFIX');
      analysis.issues.missingDataPrefix++;
      
      // Check if it's just base64 data without the prefix
      if (isValidBase64(avatarData)) {
        userAnalysis.canFix = true;
        userAnalysis.suggestedFix = 'ADD_DATA_PREFIX';
      }
    } else if (!VALID_DATA_URL_REGEX.test(avatarData)) {
      // Check specific issues with data URLs
      const parts = avatarData.split(',');
      if (parts.length !== 2) {
        userAnalysis.issues.push('INVALID_DATA_URL_FORMAT');
        analysis.issues.other++;
      } else {
        const [header, base64Data] = parts;
        
        if (!header.includes('image/')) {
          userAnalysis.issues.push('INVALID_MIME_TYPE');
          analysis.issues.invalidMimeType++;
          userAnalysis.canFix = true;
          userAnalysis.suggestedFix = 'FIX_MIME_TYPE';
        }
        
        if (!isValidBase64(base64Data)) {
          userAnalysis.issues.push('INVALID_BASE64');
          analysis.issues.invalidBase64++;
        } else if (userAnalysis.issues.length === 1 && userAnalysis.issues[0] === 'INVALID_MIME_TYPE') {
          userAnalysis.canFix = true;
        }
      }
    } else {
      userAnalysis.isValid = true;
      analysis.valid++;
    }

    if (!userAnalysis.isValid) {
      analysis.invalid++;
    }

    analysis.users.push(userAnalysis);
  }

  return analysis;
}

function isValidBase64(str) {
  try {
    // Check if it's valid base64
    const decoded = Buffer.from(str, 'base64');
    const reencoded = decoded.toString('base64');
    
    // Remove padding for comparison
    const cleanOriginal = str.replace(/=+$/, '');
    const cleanReencoded = reencoded.replace(/=+$/, '');
    
    return cleanOriginal === cleanReencoded;
  } catch (error) {
    return false;
  }
}

function detectImageType(base64Data) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Check magic numbers for different image formats
    if (buffer.length < 4) return null;
    
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'jpeg';
    }
    
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'png';
    }
    
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'gif';
    }
    
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'webp';
    }
    
    // Default to jpeg if we can't detect
    return 'jpeg';
  } catch (error) {
    return 'jpeg';
  }
}

function fixAvatarData(avatarData, issues, suggestedFix) {
  if (!avatarData || avatarData === 'null' || avatarData === '<null>') {
    return null; // Can't fix null/empty data
  }

  if (suggestedFix === 'ADD_DATA_PREFIX') {
    // Detect image type from base64 data
    const imageType = detectImageType(avatarData);
    return `data:image/${imageType};base64,${avatarData}`;
  }

  if (suggestedFix === 'FIX_MIME_TYPE') {
    const parts = avatarData.split(',');
    if (parts.length === 2) {
      const base64Data = parts[1];
      const imageType = detectImageType(base64Data);
      return `data:image/${imageType};base64,${base64Data}`;
    }
  }

  return avatarData; // Return as-is if we can't fix it
}

async function fixAvatarDataInDatabase(dryRun = true) {
  console.log(`🔧 ${dryRun ? 'DRY RUN - ' : ''}Fixing avatar data in the database...\n`);
  
  const analysis = await analyzeAvatarData();
  
  console.log('📊 Analysis Results:');
  console.log(`Total users with avatar data: ${analysis.total}`);
  console.log(`Valid avatars: ${analysis.valid}`);
  console.log(`Invalid avatars: ${analysis.invalid}`);
  console.log('\nIssue breakdown:');
  console.log(`- Missing data: prefix: ${analysis.issues.missingDataPrefix}`);
  console.log(`- Invalid MIME type: ${analysis.issues.invalidMimeType}`);
  console.log(`- Invalid base64: ${analysis.issues.invalidBase64}`);
  console.log(`- Too short: ${analysis.issues.tooShort}`);
  console.log(`- Null or empty: ${analysis.issues.nullOrEmpty}`);
  console.log(`- Other issues: ${analysis.issues.other}`);
  console.log('');

  const fixableUsers = analysis.users.filter(user => user.canFix);
  console.log(`🛠️  Found ${fixableUsers.length} users with fixable avatar data\n`);

  if (fixableUsers.length === 0) {
    console.log('✅ No fixable issues found!');
    return;
  }

  const fixes = [];

  for (const user of fixableUsers) {
    const originalData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarData: true }
    });

    if (!originalData?.avatarData) continue;

    const fixedData = fixAvatarData(originalData.avatarData, user.issues, user.suggestedFix);
    
    if (fixedData && fixedData !== originalData.avatarData) {
      fixes.push({
        userId: user.id,
        userName: user.name,
        originalLength: originalData.avatarData.length,
        fixedLength: fixedData.length,
        issues: user.issues,
        suggestedFix: user.suggestedFix,
        originalData: originalData.avatarData,
        fixedData: fixedData
      });

      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   Issues: ${user.issues.join(', ')}`);
      console.log(`   Fix: ${user.suggestedFix}`);
      console.log(`   Original length: ${originalData.avatarData.length}`);
      console.log(`   Fixed length: ${fixedData.length}`);
      console.log(`   Original: ${originalData.avatarData.substring(0, 50)}...`);
      console.log(`   Fixed: ${fixedData.substring(0, 50)}...`);
      console.log('');
    }
  }

  if (fixes.length === 0) {
    console.log('✅ No fixes needed to be applied!');
    return;
  }

  if (dryRun) {
    console.log(`🔍 DRY RUN: Would fix ${fixes.length} users' avatar data`);
    console.log('Run with --apply to actually apply the fixes');
    return;
  }

  // Apply fixes
  console.log(`🚀 Applying fixes to ${fixes.length} users...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const fix of fixes) {
    try {
      await prisma.user.update({
        where: { id: fix.userId },
        data: { avatarData: fix.fixedData }
      });
      
      console.log(`✅ Fixed avatar for ${fix.userName}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to fix avatar for ${fix.userName}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n🎉 Completed! ${successCount} fixes applied, ${errorCount} errors`);
}

async function backupAvatarData() {
  console.log('💾 Creating backup of avatar data...');
  
  const users = await prisma.user.findMany({
    where: {
      avatarData: {
        not: null
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarData: true
    }
  });

  const backup = {
    timestamp: new Date().toISOString(),
    totalUsers: users.length,
    users: users
  };

  const backupPath = path.join(process.cwd(), 'scripts', `avatar-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  
  console.log(`✅ Backup created: ${backupPath}`);
  return backupPath;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');
  const shouldBackup = args.includes('--backup') || shouldApply;

  try {
    console.log('🚀 Avatar Data Fixer Script\n');

    if (shouldBackup) {
      await backupAvatarData();
      console.log('');
    }

    await fixAvatarDataInDatabase(!shouldApply);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();