import { NextRequest, NextResponse } from 'next/server';
import config from '../../../logto.config';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    config: {
      endpoint: config.endpoint ? 'SET' : 'NOT SET',
      appId: config.appId ? 'SET' : 'NOT SET',
      baseUrl: config.baseUrl,
      cookieSecret: config.cookieSecret ? 'SET' : 'NOT SET',
      cookieSecure: config.cookieSecure,
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      LOGTO_ENDPOINT: process.env.LOGTO_ENDPOINT ? 'SET' : 'NOT SET',
      LOGTO_APP_ID: process.env.LOGTO_APP_ID ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    }
  });
}
