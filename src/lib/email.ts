import nodemailer from 'nodemailer';

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

export async function sendPasswordResetCode(email: string, code: string) {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: 'Your Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px;">Password Reset Request</h1>
        </div>
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <p>Hello,</p>
          <p>You have received a password reset For <a href="https://holitime-438323004618.us-west2.run.app/">Hands on Labor's Workforce Management Portal</a>.  Please use the following code to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <p style="background-color: #f3f4f6; color: #1f2937; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 24px; letter-spacing: 4px;">
              ${code}
            </p>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset code sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send password reset code to ${email}:`, error);
    throw new Error('Could not send the password reset email.');
  }
}