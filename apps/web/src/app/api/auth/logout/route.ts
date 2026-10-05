import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('yatrasarthi_session');
    return NextResponse.json({ data: { loggedOut: true } });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'LOGOUT_FAILED', message: error.message } }, { status: 500 });
  }
}
