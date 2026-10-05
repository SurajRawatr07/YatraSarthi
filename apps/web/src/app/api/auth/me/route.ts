import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    return NextResponse.json({ data: { user } });
  } catch (error: any) {
    console.error('API /api/auth/me Error:', error);
    return NextResponse.json({ data: { user: null } });
  }
}
