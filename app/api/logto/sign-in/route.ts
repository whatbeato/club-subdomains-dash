import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next';
import config from '../../../../logto.config';
import { serialize } from 'cookie';
import { createHash, randomBytes } from 'crypto';

// Generate a proper PKCE code verifier (43-128 characters)
function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

const logtoClient = new LogtoClient(config);

export async function GET(request: NextRequest) {
  console.log('=== SIGN-IN ROUTE DEBUG ===');
  console.log('Request URL:', request.url);
  console.log('Logto Config:', {
    endpoint: config.endpoint,
    appId: config.appId,
    appSecret: config.appSecret ? 'SET' : 'NOT SET',
    baseUrl: config.baseUrl,
    cookieSecure: config.cookieSecure
  });
  
  const cookiesToSet: string[] = [];
  let redirectTarget: string | null = null;

  const mockRes: any = {
    setHeader: (name: string, value: string) => {
      console.log('Setting header:', name, value);
      if (name.toLowerCase() === 'set-cookie') {
        cookiesToSet.push(value);
      }
    },
    redirect: (url: string) => {
      console.log('Logto wants to redirect to:', url);
      redirectTarget = url;
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
  console.log('Redirect URI:', redirectUri);

  try {
    console.log('Calling logtoClient.handleSignIn...');
    console.log('Expected callback URL should be:', `${config.baseUrl}/api/logto/callback`);
    await logtoClient.handleSignIn(mockReq, mockRes);
    console.log('handleSignIn completed successfully');
  } catch (error) {
    console.error('Error in handleSignIn:', error);
    
    // Fallback: construct the OAuth URL manually since the SDK isn't working
    const state = Math.random().toString(36).substring(2, 15);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    
    const authUrl = new URL(`${config.endpoint.replace(/\/$/, '')}/oidc/auth`);
    authUrl.searchParams.set('client_id', config.appId);
    authUrl.searchParams.set('redirect_uri', `${config.baseUrl}/api/logto/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    console.log('Manual OAuth URL:', authUrl.toString());
    
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('logto_state', state, { httpOnly: true, secure: config.cookieSecure });
    response.cookies.set('logto_code_verifier', codeVerifier, { httpOnly: true, secure: config.cookieSecure });
    
    return response;
  }

  console.log('Redirect target after handleSignIn:', redirectTarget);
  console.log('Cookies to set:', cookiesToSet);

  if (redirectTarget) {
    console.log('Redirecting to Logto:', redirectTarget);
    const response = NextResponse.redirect(redirectTarget);
    cookiesToSet.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;
  } else {
    console.log('No redirect target from Logto, constructing manual OAuth URL...');
    
    // Manual OAuth URL construction as fallback
    const state = Math.random().toString(36).substring(2, 15);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    
    const authUrl = new URL(`${config.endpoint.replace(/\/$/, '')}/oidc/auth`);
    authUrl.searchParams.set('client_id', config.appId);
    authUrl.searchParams.set('redirect_uri', `${config.baseUrl}/api/logto/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    console.log('Manual OAuth URL:', authUrl.toString());
    
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('logto_state', state, { httpOnly: true, secure: config.cookieSecure });
    response.cookies.set('logto_code_verifier', codeVerifier, { httpOnly: true, secure: config.cookieSecure });
    
    return response;
  }
}
