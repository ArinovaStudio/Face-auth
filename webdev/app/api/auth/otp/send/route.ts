import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/sendEmail';
import { hashPassword, generateOtp } from '@/lib/auth';
import { getOtpTemplate } from '@/lib/templates';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const plainOtp = generateOtp();

    const hashedOtp = await hashPassword(plainOtp);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);  // 5 minutes

    await prisma.otp.upsert({
      where: { email },
      update: {
        code: hashedOtp,
        expiresAt,
      },
      create: {
        email,
        code: hashedOtp,
        expiresAt,
      },
    });

    const template = getOtpTemplate(plainOtp);
    await sendEmail( email, template.subject, template.html);

    return NextResponse.json({ success: true, message: 'OTP sent successfully' }, { status: 200 });

  } catch (error) {
    console.error('OTP Send Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send OTP' }, { status: 500 });
  }
}