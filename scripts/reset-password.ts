const { prisma: prismaClient } = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

async function resetPassword(userEmail: string, newPassword: string) {
  try {
    // First find the user by email
    const user = await prismaClient.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password in the database
    const updatedUser = await prismaClient.user.update({
      where: { id: user.id },
      data: { password_hash: hashedPassword },
    });

    console.log(`Password for user ${updatedUser.email} (ID: ${updatedUser.id}) has been successfully reset.`);
  } catch (error) {
    console.error('Error resetting password:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
  } finally {
    await prismaClient.$disconnect();
  }
}

// Get user email and new password from command line arguments
const args = process.argv.slice(2);
const userEmail = args[0];
const newPassword = args[1];

if (!userEmail || !newPassword) {
  console.error('Usage: ts-node scripts/reset-password.ts <userEmail> <newPassword>');
  process.exit(1);
}

resetPassword(userEmail, newPassword);
