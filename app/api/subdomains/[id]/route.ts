
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import LogtoClient from '@logto/next';
import config from '../../../logto.config';
import { serialize } from 'cookie';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID || '');
const logtoClient = new LogtoClient(config);

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookiesToSet: string[] = [];
    const mockResponse = {
      setHeader: (name: string, value: string) => {
        if (name.toLowerCase() === 'set-cookie') {
          cookiesToSet.push(value);
        }
      },
    };

    const nodeClient = await logtoClient.createNodeClientFromNextApi(
      {
        ...request,
        cookies: request.cookies.getAll().reduce((acc: Record<string, string>, cookie: { name: string, value: string }) => {
          acc[cookie.name] = cookie.value;
          return acc;
        }, {}),
      } as any,
      mockResponse as any
    );

    const session = await nodeClient.getContext();

    if (!session || !session.isAuthenticated) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const userEmail = session.userInfo?.email;

    if (!userEmail) {
      return new NextResponse(JSON.stringify({ message: 'User email not found' }), { status: 400 });
    }

    const { id } = params;
    const { githubRepo } = await request.json();

    // Verify the user owns this subdomain before updating
    const existingRecord = await base('Subdomains').find(id);

    if (!existingRecord) {
      return new NextResponse(JSON.stringify({ message: 'Subdomain not found' }), { status: 404 });
    }

    if (existingRecord.get('Email') !== userEmail) {
      return new NextResponse(JSON.stringify({ message: 'Forbidden: You can only edit your own subdomains.' }), { status: 403 });
    }

    const updatedRecords = await base('Subdomains').update([
      {
        id: id,
        fields: {
          'Github Repo': githubRepo,
        },
      },
    ]);

    const response = NextResponse.json({ message: "GitHub Repo updated successfully.", record: updatedRecords[0] });
    cookiesToSet.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;

  } catch (error: any) {
    console.error('Error updating subdomain:', error);
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
