import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Create a test admin user with known credentials
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = await hashPassword(password);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Test user already exists',
        user: {
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }
    
    // Create the test user
    const user = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: email,
        passwordHash: hashedPassword,
        role: 'Admin',
        isActive: true,
        crew_chief_eligible: false,
        fork_operator_eligible: false,
        certifications: [],
        performance: null,
        location: null,
        companyId: null,
        avatarData: null
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        email: user.email,
        role: user.role
      },
      credentials: {
        email: email,
        password: password
      }
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}