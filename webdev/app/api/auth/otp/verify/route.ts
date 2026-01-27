import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: 'Email and OTP are required' }, { status: 400 });
    }

    const otpRecord = await prisma.otp.findUnique({ where: { email } });

    if (!otpRecord) {
      return NextResponse.json({ success: false, message: 'OTP not found. Please request a new one.' }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ success: false, message: 'OTP has expired' }, { status: 400 });
    }

    const isValid = await comparePassword(otp, otpRecord.code);

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid code' }, { status: 400 });
    }

    await prisma.otp.delete({ where: { email } });

    return NextResponse.json({ success: true, message: 'Verification successful' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}