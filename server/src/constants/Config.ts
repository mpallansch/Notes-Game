export default (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') ? {
  sessionSecret: 'session secret',
  apiPort: 3001,
  ioPort: 3002,
  emailFrom: '',
  emailClientId: '',
  emailClientSecret: '',
  emailRefreshToken: '',
  emailAccessToken: '',
  name: '',
  clientUrl: process.env.NODE_ENV === 'local' ? 'http://localhost:3000' : 'http://localhost:3001',
  resetPasswordPath: '',
  captchaSecretKey: '6LeeaRMlAAAAADpQS8sPfdvnqMolPf2p4YLyEtJJ'
} : {
  sessionSecret: 'session secret',
  apiPort: 443,
  ioPort: 7102,
  emailFrom: '',
  emailClientId: '',
  emailClientSecret: '',
  emailRefreshToken: '',
  emailAccessToken: '',
  name: '',
  clientUrl: 'http://www.death-card-game.com:443',
  resetPasswordPath: '',
  captchaSecretKey: '6LccShIlAAAAAGDIOFgtMFbwIcMYZfO3vYIUrqGr'
};
