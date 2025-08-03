import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/auth';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  role: z.enum(['Employee', 'CrewChief', 'Admin', 'CompanyUser', 'Staff']).default('Employee'),
  companyName: z.string().min(1, 'Company name is required').optional(),
  phone: z.string().regex(/^[+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(registerSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: (validation as any).error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password, name, role, companyName, phone } = validation.data;

    // Check if user already exists
    try {
      await getUserByEmail(email);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    } catch (error) {
      // This is expected if the user does not exist, so we can continue.
    }

    // Create new user
    const user = await createUser({
      email,
      password,
      name,
      role,
      companyName,
      phone,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
