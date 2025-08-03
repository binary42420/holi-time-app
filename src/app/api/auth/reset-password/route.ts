import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, code, password } = await request.json();

    if (!email || !code || !password) {
      return NextResponse.json({ error: 'Email, code, and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or code' }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    const isCodeValid = await bcrypt.compare(code, resetToken.token);
    if (!isCodeValid) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json({ error: 'Reset code has expired' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}