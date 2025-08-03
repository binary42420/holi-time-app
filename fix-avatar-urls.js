import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function fixAvatarUrls() {
  console.log('🔍 Starting avatar URL fix process...');
  
  try {
    // Get all users with avatar URLs
    const users = await prisma.user.findMany({
      where: {
        avatarUrl: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true
      }
    });

    console.log(`📊 Found ${users.length} users with avatar URLs`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`\n👤 Processing user: ${user.name} (${user.id})`);
        console.log(`   Current URL: ${user.avatarUrl}`);

        let newAvatarUrl = user.avatarUrl;
        let needsUpdate = false;

        // Check if it's a Pollinations AI URL - convert to internal API
        if (user.avatarUrl.includes('image.pollinations.ai/prompt/')) {
          // Convert all Pollinations AI URLs to use internal API for consistency
          newAvatarUrl = `/api/users/${user.id}/avatar/image`;
          needsUpdate = true;
          console.log(`   ✅ Converted Pollinations AI URL to internal API: ${newAvatarUrl}`);
        }
        // Check if it's a data URL that should use the internal API
        else if (user.avatarUrl.startsWith('data:')) {
          // Convert to use internal avatar API
          newAvatarUrl = `/api/users/${user.id}/avatar/image`;
          needsUpdate = true;
          console.log(`   ✅ Converted data URL to internal API: ${newAvatarUrl}`);
        }
        // Check if it's already an internal API URL
        else if (user.avatarUrl.startsWith('/api/users/') && user.avatarUrl.includes('/avatar/image')) {
          console.log(`   ✅ Already using internal API`);
        }
        // Check for other external URLs that might need fixing
        else if (user.avatarUrl.startsWith('http')) {
          try {
            // Test if the URL is valid by creating a URL object
            new URL(user.avatarUrl);
            console.log(`   ✅ External URL appears valid`);
          } catch (urlError) {
            console.log(`   ⚠️  Invalid URL format, converting to internal API`);
            newAvatarUrl = `/api/users/${user.id}/avatar/image`;
            needsUpdate = true;
          }
        }
        else {
          console.log(`   ⚠️  Unusual URL format: ${user.avatarUrl}`);
        }

        // Update the user if needed
        if (needsUpdate) {
          await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: newAvatarUrl }
          });
          
          console.log(`   ✅ Updated user ${user.name}`);
          fixedCount++;
        }

      } catch (userError) {
        console.error(`   ❌ Error processing user ${user.name}:`, userError.message);
        errorCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Total users processed: ${users.length}`);
    console.log(`   URLs fixed: ${fixedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   No changes needed: ${users.length - fixedCount - errorCount}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Additional function to validate all avatar URLs
async function validateAvatarUrls() {
  console.log('\n🔍 Validating all avatar URLs...');
  
  try {
    const users = await prisma.user.findMany({
      where: {
        avatarUrl: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true
      }
    });

    console.log(`📊 Validating ${users.length} avatar URLs`);

    for (const user of users) {
      console.log(`\n👤 ${user.name}:`);
      console.log(`   URL: ${user.avatarUrl}`);
      
      if (user.avatarUrl.startsWith('data:')) {
        console.log(`   Type: Base64 data URL`);
      } else if (user.avatarUrl.startsWith('/api/users/')) {
        console.log(`   Type: Internal API endpoint`);
      } else if (user.avatarUrl.startsWith('http')) {
        console.log(`   Type: External URL`);
        
        // Check if it's properly encoded
        try {
          const url = new URL(user.avatarUrl);
          console.log(`   Status: Valid URL format`);
          
          if (url.hostname === 'image.pollinations.ai') {
            const pathname = url.pathname;
            if (pathname.includes('/prompt/')) {
              const prompt = pathname.split('/prompt/')[1];
              const decoded = decodeURIComponent(prompt);
              const reEncoded = encodeURIComponent(decoded);
              
              if (prompt === reEncoded) {
                console.log(`   Encoding: ✅ Properly encoded`);
              } else {
                console.log(`   Encoding: ⚠️  Needs re-encoding`);
                console.log(`   Current:  ${prompt}`);
                console.log(`   Should be: ${reEncoded}`);
              }
            }
          }
        } catch (urlError) {
          console.log(`   Status: ❌ Invalid URL format`);
        }
      } else {
        console.log(`   Type: ⚠️  Unknown format`);
      }
    }

  } catch (error) {
    console.error('❌ Validation error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--validate-only')) {
    await validateAvatarUrls();
  } else if (args.includes('--fix')) {
    await fixAvatarUrls();
  } else {
    console.log('Avatar URL Management Script');
    console.log('');
    console.log('Usage:');
    console.log('  node fix-avatar-urls.js --validate-only  # Just check URLs without fixing');
    console.log('  node fix-avatar-urls.js --fix           # Fix problematic URLs');
    console.log('');
    console.log('Running validation first...');
    await validateAvatarUrls();
    
    console.log('\n' + '='.repeat(50));
    console.log('To fix the issues found above, run:');
    console.log('node fix-avatar-urls.js --fix');
  }
}

main().catch(console.error);