
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import LogtoClient from '@logto/next';
import config from '../../../logto.config';
import { serialize } from 'cookie';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID || '');
const logtoClient = new LogtoClient(config);

export async function GET(request: NextRequest) {
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

    // Check for manual OAuth authentication first
    const accessToken = cookies['logto:access_token'];
    let isAuthenticated = false;

    if (accessToken) {
      // Verify access token with Logto
      try {
        const userInfoResponse = await fetch(`${config.endpoint.replace(/\/$/, '')}/oidc/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        isAuthenticated = userInfoResponse.ok;
      } catch (error) {
        console.error('Error verifying access token:', error);
      }
    }

    // Fallback to SDK authentication if manual auth fails
    if (!isAuthenticated) {
      const nodeClient = await logtoClient.createNodeClientFromNextApi(
        {
          ...request,
          cookies,
        } as any,
        mockResponse as any
      );

      const session = await nodeClient.getContext();
      isAuthenticated = session?.isAuthenticated || false;
    }

    if (!isAuthenticated) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const records = await base('Domains').select({
      view: 'Grid view'
    }).firstPage();

    const domains = records.map(record => ({
      id: record.id,
      name: record.get('Name'),
    }));

    const response = NextResponse.json(domains);
    cookiesToSet.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;

  } catch (error: any) {
    console.error('Error fetching domains:', error);
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
