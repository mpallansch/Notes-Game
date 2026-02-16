const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? undefined : 'session secret');

if (isProduction && !sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

export default {
  sessionSecret,
  apiPort: parseInt(process.env.API_PORT || '3001', 10),
  ioPort: parseInt(process.env.IO_PORT || '3002', 10),
  emailFrom: process.env.EMAIL_FROM || '',
  emailClientId: process.env.EMAIL_CLIENT_ID || '',
  emailClientSecret: process.env.EMAIL_CLIENT_SECRET || '',
  emailRefreshToken: process.env.EMAIL_REFRESH_TOKEN || '',
  emailAccessToken: process.env.EMAIL_ACCESS_TOKEN || '',
  name: process.env.APP_NAME || '',
  clientUrl: process.env.CLIENT_URL || (process.env.NODE_ENV === 'local' ? 'http://localhost:3000' : 'http://localhost:3001'),
  resetPasswordPath: process.env.RESET_PASSWORD_PATH || '',
  captchaSecretKey: process.env.CAPTCHA_SECRET_KEY || '6LeeaRMlAAAAADpQS8sPfdvnqMolPf2p4YLyEtJJ'
};
