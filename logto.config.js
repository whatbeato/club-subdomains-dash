/* logto.config.js */

const config = {
  endpoint: process.env.LOGTO_ENDPOINT || '',
  appId: process.env.LOGTO_APP_ID || '',
  appSecret: process.env.LOGTO_APP_SECRET || '',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  cookieSecret: process.env.COOKIE_SECRET || 'a-very-secret-key-that-should-be-at-least-32-characters-long',
  cookieSecure: process.env.NODE_ENV === 'production',
  resources: [],
  scopes: ['openid', 'profile', 'email'],
};

console.log("Logto Config - cookieSecret:", config.cookieSecret ? "Set" : "Not Set", "Length:", config.cookieSecret?.length);

export default config;
