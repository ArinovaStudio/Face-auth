import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken, comparePassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import z from 'zod';
import { formatZodErrors } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, message: "Validation failed", errors: formatZodErrors(validation.error) }, { status: 400 });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found'}, { status: 404 });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid credentials'}, { status: 401 });
    }

    const token = generateToken(user.id, user.role);
    const cookieStore = await cookies();

    cookieStore.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json( { success: true, message: 'Login successful', user: userWithoutPassword },{ status: 200 });

  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' },{ status: 500 });
  }
}