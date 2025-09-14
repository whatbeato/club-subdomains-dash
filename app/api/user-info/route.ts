
import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next';
import config from '../../../logto.config';
import { serialize } from 'cookie';

const logtoClient = new LogtoClient(config);

export async function GET(request: NextRequest) {
  console.log('=== USER INFO ROUTE DEBUG ===');
  try {
    const cookiesToSet: string[] = [];

    const mockResponse = {
      setHeader: (name: string, value: string) => {
        if (name.toLowerCase() === 'set-cookie') {
          cookiesToSet.push(value);
        }
      },
    };

    const cookies = request.cookies.getAll().reduce((acc: Record<string, string>, cookie: { name: string, value: string }) => {
      acc[cookie.name] = cookie.value;
      return acc;
    }, {});
    
    console.log('All cookies:', Object.keys(cookies));
    console.log('Logto cookies:', Object.keys(cookies).filter(k => k.startsWith('logto')));

    // Check for manual OAuth cookies
    const accessToken = cookies['logto:access_token'];
    const idToken = cookies['logto:id_token'];
    
    if (accessToken || idToken) {
      console.log('Manual OAuth tokens found:', { accessToken: !!accessToken, idToken: !!idToken });
      
      try {
        // Fetch user info from Logto userinfo endpoint
        if (accessToken) {
          const userInfoResponse = await fetch(`${config.endpoint.replace(/\/$/, '')}/oidc/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            console.log('User info from Logto:', userInfo);
            
            // Try to get roles from ID token or user info
            let userRoles = [];
            console.log('=== ROLES DEBUG ===');
            console.log('User info received:', userInfo);
            console.log('Looking for roles in user info...');
            
            // Check if roles are already in the userinfo response
            if (userInfo.roles) {
              userRoles = userInfo.roles;
              console.log('Found roles in userinfo:', userRoles);
            } else {
              // Try Management API approach
              try {
                console.log('Trying Management API for roles...');
                const rolesResponse = await fetch(`${config.endpoint.replace(/\/$/, '')}/api/users/${userInfo.sub}/roles`, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                });
                
                console.log('Roles response status:', rolesResponse.status);
                if (rolesResponse.ok) {
                  userRoles = await rolesResponse.json();
                  console.log('User roles from Management API:', userRoles);
                } else {
                  const errorText = await rolesResponse.text();
                  console.log('Management API error:', rolesResponse.status, errorText);
                }
              } catch (roleError) {
                console.log('Error fetching roles from Management API:', roleError);
              }
            }
            
            // Temporary hardcoded roles for testing - replace with actual API call once configured
            const tempRoles = [];
            if (userInfo.email === 'fonz@tuta.com' || userInfo.sub === '2rbv6x29r3se') {
              tempRoles.push(
                { id: '5qklnjvv7q4kvlx130hnx', name: 'More Subdomains' },
                { id: 'db1lec6115beilwhuegth', name: 'Admin' }
              );
            }
            
            const finalRoles = userRoles.length > 0 ? userRoles : tempRoles;
            console.log('Final roles being returned:', finalRoles);

            return new NextResponse(
              JSON.stringify({ isAuthenticated: true, userInfo: { ...userInfo, roles: finalRoles } }),
              { status: 200 }
            );
          } else {
            console.error('Failed to fetch user info:', await userInfoResponse.text());
          }
        }
      } catch (error) {
        console.error('Error fetching user info with access token:', error);
      }
    }

    // Fallback to Logto SDK
    console.log('Trying Logto SDK...');
    const nodeClient = await logtoClient.createNodeClientFromNextApi(
      {
        ...request,
        cookies,
      } as any,
      mockResponse as any
    );

    const session = await nodeClient.getContext();
    console.log('SDK Session:', { isAuthenticated: session.isAuthenticated, userInfo: !!session.userInfo });

    // Try to fetch roles for SDK session too
    let userInfo = session.userInfo;
    if (session.isAuthenticated && session.userInfo) {
      try {
        const token = await nodeClient.getAccessToken();
        if (token) {
          const rolesResponse = await fetch(`${config.endpoint.replace(/\/$/, '')}/api/users/${session.userInfo.sub}/roles`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (rolesResponse.ok) {
            const userRoles = await rolesResponse.json();
            userInfo = { ...session.userInfo, roles: userRoles };
            console.log('SDK User roles:', userRoles);
          }
        }
      } catch (roleError) {
        console.log('Error fetching SDK roles, continuing without them:', roleError);
      }
    }

    const response = new NextResponse(
      JSON.stringify({ isAuthenticated: session.isAuthenticated, userInfo }),
      { status: 200 }
    );

    cookiesToSet.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;

  } catch (error: any) {
    console.error('Error fetching user info:', error);
    return new NextResponse(JSON.stringify({ message: error.message, isAuthenticated: false }), { status: 500 });
  }
}
