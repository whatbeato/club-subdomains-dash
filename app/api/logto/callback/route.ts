import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next';
import config from '../../../../logto.config';
import { serialize } from 'cookie';

const logtoClient = new LogtoClient(config);

export async function GET(request: NextRequest) {
  console.log("=== CALLBACK ROUTE DEBUG ===");
  console.log("Request URL:", request.url);
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  console.log("OAuth params:", { code: !!code, state, error });
  
  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(`${config.baseUrl}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error("No authorization code received");
    return NextResponse.redirect(`${config.baseUrl}?error=no_code`);
  }

  // Check if we have manual OAuth state (from our custom implementation)
  const storedState = request.cookies.get('logto_state')?.value;
  const codeVerifier = request.cookies.get('logto_code_verifier')?.value;
  
  console.log("Stored state match:", storedState === state);
  console.log("Code verifier present:", !!codeVerifier);

  if (codeVerifier && storedState === state) {
    // Handle manual OAuth callback
    console.log("Handling manual OAuth callback...");
    
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(`${config.endpoint.replace(/\/$/, '')}/oidc/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.appId,
          client_secret: config.appSecret,
          code,
          redirect_uri: `${config.baseUrl}/api/logto/callback`,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", await tokenResponse.text());
        return NextResponse.redirect(`${config.baseUrl}?error=token_exchange_failed`);
      }

      const tokens = await tokenResponse.json();
      console.log("Tokens received:", { access_token: !!tokens.access_token, id_token: !!tokens.id_token });

      // Create response and set cookies
      const response = NextResponse.redirect(config.baseUrl);
      
      // Clear temporary cookies
      response.cookies.delete('logto_state');
      response.cookies.delete('logto_code_verifier');
      
      // Set auth cookies (using Logto's expected cookie names)
      if (tokens.access_token) {
        response.cookies.set('logto:access_token', tokens.access_token, {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: 'lax',
          maxAge: tokens.expires_in || 3600
        });
      }
      
      if (tokens.id_token) {
        response.cookies.set('logto:id_token', tokens.id_token, {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: 'lax',
          maxAge: tokens.expires_in || 3600
        });
      }

      if (tokens.refresh_token) {
        response.cookies.set('logto:refresh_token', tokens.refresh_token, {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });
      }

      console.log("Manual OAuth callback completed successfully");
      return response;
      
    } catch (error) {
      console.error("Manual OAuth callback error:", error);
      return NextResponse.redirect(`${config.baseUrl}?error=callback_failed`);
    }
  } else {
    // Try Logto SDK callback
    console.log("Trying Logto SDK callback...");
    
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

    try {
      await logtoClient.handleSignInCallback(mockReq, mockRes);
      console.log("SDK callback completed successfully");
    } catch (error) {
      console.error("SDK callback error:", error);
      return NextResponse.redirect(`${config.baseUrl}?error=sdk_callback_failed`);
    }

    console.log("Set-Cookie headers from LogtoClient:", cookiesToSet);

    if (!finalRedirectTarget) {
      finalRedirectTarget = config.baseUrl;
    }

    const response = NextResponse.redirect(finalRedirectTarget.startsWith('http') ? finalRedirectTarget : new URL(finalRedirectTarget, request.url));
    cookiesToSet.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;
  }
}
