
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
    let userEmail = null;

    if (accessToken) {
      // Verify access token with Logto and get user info
      try {
        const userInfoResponse = await fetch(`${config.endpoint.replace(/\/$/, '')}/oidc/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          isAuthenticated = true;
          userEmail = userInfo.email;
        }
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
      userEmail = session?.userInfo?.email;
    }

    if (!isAuthenticated) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    if (!userEmail) {
      return new NextResponse(JSON.stringify({ message: 'User email not found' }), { status: 400 });
    }

    const records = await base('Subdomains').select({
      filterByFormula: `{Email} = "${userEmail}"`, // Filter by logged-in user's email
      view: 'Grid view' // or any other view you prefer
    }).firstPage();

    const subdomains = records.map(record => ({
      id: record.id,
      subdomain: record.get('Subdomain'),
      email: record.get('Email'),
      githubRepo: record.get('Github Repo'),
      domains: record.get('Domains'), // Linked record ID(s)
      domainName: record.get('Name (from Domains)'), // Auto-pulled from linked Domains table
      clubName: record.get('Club Name'), // Linked record ID(s)
      clubNameAfonso: record.get('Club Name (from club names - afonso)'), // Auto-pulled from linked Club Names table
      status: record.get('Status'),
    }));

    const response = NextResponse.json(subdomains);
    cookiesToSet.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;

  } catch (error: any) {
    console.error('Error fetching subdomains:', error);
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    let userEmail = null;

    if (accessToken) {
      // Verify access token with Logto and get user info
      try {
        const userInfoResponse = await fetch(`${config.endpoint.replace(/\/$/, '')}/oidc/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          isAuthenticated = true;
          userEmail = userInfo.email;
        }
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
      userEmail = session?.userInfo?.email;
    }

    if (!isAuthenticated) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    if (!userEmail) {
      return new NextResponse(JSON.stringify({ message: 'User email not found' }), { status: 400 });
    }

    const { subdomain, githubRepo, domains, clubName } = await request.json();

    // Verify that the Email matches the logged-in user’s email.
    // No need to explicitly verify here, as we are using the userEmail from the session.

    const createdRecords = await base('Subdomains').create([
      {
        fields: {
          'Subdomain': subdomain,
          'Email': userEmail,
          'Github Repo': githubRepo,
          'Domains': domains, // This should be an array of record IDs if it's a linked record field
          'Club Name': clubName, // This should be an array of record IDs if it's a linked record field
          'Status': false, // Newly created subdomains are inactive by default
        },
      },
    ]);

    const response = NextResponse.json({ message: "Subdomain request submitted successfully. Your subdomain will be active in 24h.", record: createdRecords[0] });
    cookiesToSet.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;

  } catch (error: any) {
    console.error('Error creating subdomain:', error);
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
