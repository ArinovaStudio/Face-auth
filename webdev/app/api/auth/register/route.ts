import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken, hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import z from 'zod';
import { formatZodErrors } from '@/lib/utils';

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, message: "Validation failed", errors: formatZodErrors(validation.error) }, { status: 400 });
    }

    const { email, password, fullName } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, fullName }
    });

    const token = generateToken(user.id, user.role);
    const cookieStore = await cookies();
    
    cookieStore.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json( { success: true, message: 'User created successfully', user: userWithoutPassword },{ status: 201 });

  } catch (error) {
    return NextResponse.json( { success: false, message: 'Internal server error' }, { status: 500 });
  }
}