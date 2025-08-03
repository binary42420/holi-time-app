import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetCode } from '@/lib/email';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Generate a 6-digit code
      const code = crypto.randomInt(100000, 999999).toString();
      
      // Hash the code before storing it
      const hashedCode = await bcrypt.hash(code, 10);
      
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Invalidate any old tokens for this user
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

      // Create a new password reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedCode,
          expiresAt,
        },
      });

      // Send the plain text code to the user
      await sendPasswordResetCode(email, code);
    }

    // Always return a success message to prevent user enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset code has been sent.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}