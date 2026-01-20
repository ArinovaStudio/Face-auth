export const getOtpTemplate = (otp: string) => {
  return {
      subject: 'Your Verification Code',
      html: `
        <p>Your OTP is <b>${otp}</b>.</p>
        <p>It expires in 10 minutes.</p>
      `,
    };
};