import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next';
import config from '../../../../logto.config';
import { serialize } from 'cookie';

const logtoClient = new LogtoClient(config);

export async function GET(request: NextRequest) {
  const cookiesToSet: string[] = [];
  let finalRedirectTarget: string | null = null;

  const mockRes: any = {
    setHeader: (name: string, value: string) => {
      if (name.toLowerCase() === 'set-cookie') {
        cookiesToSet.push(value);
      }
    },
    redirect: (url: string) => {
      finalRedirectTarget = url;
    },
  };

  const mockReq: any = {
    ...request,
    url: request.url,
    cookies: request.cookies.getAll().reduce((acc: Record<string, string>, cookie: { name: string, value: string }) => {
      acc[cookie.name] = cookie.value;
      return acc;
    }, {}),
    headers: Object.fromEntries(request.headers.entries()),
  };

  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirectUri') || config.baseUrl;

  await logtoClient.handleSignOut(mockReq, mockRes);

  // Ensure a redirect target is always set, even if LogtoClient didn't explicitly provide one.
  if (!finalRedirectTarget) {
    finalRedirectTarget = redirectUri; // Default to the original redirectUri
  }

  const response = NextResponse.redirect(new URL(finalRedirectTarget, request.url));

  // Clear manual OAuth cookies
  response.headers.append('Set-Cookie', serialize('logto:access_token', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  }));
  
  response.headers.append('Set-Cookie', serialize('logto:id_token', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  }));

  cookiesToSet.forEach(cookie => {
    response.headers.append('Set-Cookie', cookie);
  });

  return response;
}
