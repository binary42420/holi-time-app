#!/usr/bin/env node

/**
 * Avatar Analysis Script
 * 
 * This script analyzes the current state of user avatars in the database
 * to understand the different avatar storage patterns.
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

async function analyzeAvatars() {
  console.log('🔍 Analyzing avatar data in the database...\n');
  
  try {
    // Get all users with avatar data
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        avatarData: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 Total users in database: ${allUsers.length}\n`);

    // Categorize users by avatar status
    const categories = {
      bothFields: [],      // Has both avatarUrl and avatarData
      onlyUrl: [],         // Has avatarUrl but no avatarData
      onlyData: [],        // Has avatarData but no avatarUrl
      neither: [],         // Has neither
      invalidData: []      // Has invalid/null-like data
    };

    allUsers.forEach(user => {
      const hasValidUrl = user.avatarUrl && 
                         user.avatarUrl !== '<null>' && 
                         user.avatarUrl !== 'null' && 
                         user.avatarUrl.trim() !== '';
      
      const hasValidData = user.avatarData && 
                          user.avatarData !== '<null>' && 
                          user.avatarData !== 'null' && 
                          user.avatarData.trim() !== '';

      if (hasValidUrl && hasValidData) {
        categories.bothFields.push(user);
      } else if (hasValidUrl && !hasValidData) {
        categories.onlyUrl.push(user);
      } else if (!hasValidUrl && hasValidData) {
        categories.onlyData.push(user);
      } else if (!hasValidUrl && !hasValidData) {
        categories.neither.push(user);
      }

      // Check for invalid data patterns
      if ((user.avatarUrl && (user.avatarUrl === '<null>' || user.avatarUrl === 'null')) ||
          (user.avatarData && (user.avatarData === '<null>' || user.avatarData === 'null'))) {
        categories.invalidData.push(user);
      }
    });

    // Display summary
    console.log('📈 Avatar Status Summary:');
    console.log(`✅ Both avatarUrl and avatarData: ${categories.bothFields.length}`);
    console.log(`🔗 Only avatarUrl: ${categories.onlyUrl.length}`);
    console.log(`💾 Only avatarData: ${categories.onlyData.length}`);
    console.log(`❌ Neither field: ${categories.neither.length}`);
    console.log(`⚠️  Invalid data: ${categories.invalidData.length}\n`);

    // Show detailed breakdown for each category
    if (categories.bothFields.length > 0) {
      console.log('✅ Users with BOTH avatarUrl and avatarData:');
      categories.bothFields.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   avatarUrl: ${user.avatarUrl}`);
        console.log(`   avatarData: ${user.avatarData.substring(0, 50)}...`);
        console.log('');
      });
    }

    if (categories.onlyUrl.length > 0) {
      console.log('🔗 Users with ONLY avatarUrl:');
      categories.onlyUrl.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   avatarUrl: ${user.avatarUrl}`);
        console.log(`   avatarData: ${user.avatarData || 'null'}`);
        console.log('');
      });
    }

    if (categories.onlyData.length > 0) {
      console.log('💾 Users with ONLY avatarData (NEEDS FIXING):');
      categories.onlyData.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   avatarUrl: ${user.avatarUrl || 'null'}`);
        console.log(`   avatarData: ${user.avatarData.substring(0, 50)}...`);
        console.log(`   Should be: /api/users/${user.id}/avatar/image`);
        console.log('');
      });
    }

    if (categories.neither.length > 0) {
      console.log('❌ Users with NO avatar data:');
      categories.neither.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log('');
      });
    }

    if (categories.invalidData.length > 0) {
      console.log('⚠️  Users with INVALID avatar data:');
      categories.invalidData.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   avatarUrl: ${user.avatarUrl}`);
        console.log(`   avatarData: ${user.avatarData}`);
        console.log('');
      });
    }

    // Analyze avatar URL patterns
    const urlPatterns = {};
    allUsers.forEach(user => {
      if (user.avatarUrl && user.avatarUrl !== '<null>' && user.avatarUrl !== 'null') {
        if (user.avatarUrl.includes('/api/users/')) {
          urlPatterns['API Endpoint'] = (urlPatterns['API Endpoint'] || 0) + 1;
        } else if (user.avatarUrl.startsWith('http')) {
          urlPatterns['External URL'] = (urlPatterns['External URL'] || 0) + 1;
        } else if (user.avatarUrl.startsWith('data:')) {
          urlPatterns['Data URL'] = (urlPatterns['Data URL'] || 0) + 1;
        } else {
          urlPatterns['Other'] = (urlPatterns['Other'] || 0) + 1;
        }
      }
    });

    console.log('🔗 Avatar URL Patterns:');
    Object.entries(urlPatterns).forEach(([pattern, count]) => {
      console.log(`   ${pattern}: ${count}`);
    });
    console.log('');

    // Recommendations
    console.log('💡 Recommendations:');
    if (categories.onlyData.length > 0) {
      console.log(`   • Run fix-avatar-urls.js to fix ${categories.onlyData.length} users with only avatarData`);
    }
    if (categories.invalidData.length > 0) {
      console.log(`   • Clean up ${categories.invalidData.length} users with invalid data`);
    }
    if (categories.onlyData.length === 0 && categories.invalidData.length === 0) {
      console.log('   • All users have properly configured avatars! 🎉');
    }

  } catch (error) {
    console.error('❌ Error analyzing avatars:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
analyzeAvatars()
  .then(() => {
    console.log('🏁 Analysis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });

export { analyzeAvatars };