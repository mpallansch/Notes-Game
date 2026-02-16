import nodemailer from 'nodemailer';
import config from './constants/Config';

export function createTransporter() {
  if (!config.emailFrom || !config.emailClientId) {
    return null;
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: config.emailFrom,
      clientId: config.emailClientId,
      clientSecret: config.emailClientSecret,
      refreshToken: config.emailRefreshToken,
      accessToken: config.emailAccessToken,
    },
  } as any);
}

export function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const transporter = createTransporter();
  const verificationUrl = `${config.clientUrl}/#/verify-email/${token}`;

  if (!transporter) {
    console.log('[Email] Not configured. Verification link would be:', verificationUrl);
    return Promise.resolve(true);
  }

  const mail = {
    from: config.emailFrom,
    to,
    subject: 'Verify your Passing Notes account',
    html: `
      <p>Thanks for registering for Passing Notes!</p>
      <p>Please click the link below to verify your email address and activate your account:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link will expire in 24 hours. If you did not create an account, please ignore this email.</p>
    `,
  };

  return new Promise((resolve) => {
    transporter.sendMail(mail, (err) => {
      if (err) {
        console.error('Error sending verification email:', err);
        resolve(false);
      } else {
        resolve(true);
      }
      transporter.close();
    });
  });
}
