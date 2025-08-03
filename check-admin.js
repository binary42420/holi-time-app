import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: 'Admin'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true
      }
    });

    console.log('Admin users found:', admins.length);
    
    admins.forEach((admin, index) => {
      console.log(`\nAdmin ${index + 1}:`);
      console.log(`  ID: ${admin.id}`);
      console.log(`  Name: ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Active: ${admin.isActive}`);
      console.log(`  Has Password: ${admin.passwordHash ? 'Yes' : 'No'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();