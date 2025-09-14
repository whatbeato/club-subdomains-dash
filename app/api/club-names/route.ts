
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

    console.log('=== AIRTABLE DEBUG ===');
    console.log('API Key:', process.env.AIRTABLE_API_KEY ? 'SET' : 'NOT SET');
    console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
    console.log('Attempting to access table: club names - afonso');

    // Get search query from URL parameters
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search');

    let records;
    if (searchQuery && searchQuery.length >= 2) {
      // Search for specific clubs when user provides search term
      records = await base('club names - afonso').select({
        view: 'Grid view',
        filterByFormula: `SEARCH(UPPER("${searchQuery}"), UPPER({Club Name})) > 0`,
        maxRecords: 50
      }).all();
    } else {
      // Return empty array if no search term (to prevent loading all records)
      records = [];
    }

    console.log('Successfully fetched', records.length, 'club names for search:', searchQuery);

    const clubNames = records.map(record => {
      console.log('Record fields:', record.fields);
      return {
        id: record.id,
        name: record.get('Club Name') || record.get('Name'),
      };
    });

    const response = NextResponse.json(clubNames);
    cookiesToSet.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;

  } catch (error: any) {
    console.error('=== AIRTABLE ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error statusCode:', error.statusCode);
    console.error('Full error:', error);
    return new NextResponse(JSON.stringify({ 
      message: error.message,
      errorType: error.constructor.name,
      statusCode: error.statusCode 
    }), { status: 500 });
  }
}
