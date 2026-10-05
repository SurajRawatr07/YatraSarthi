import { SignJWT, jwtVerify } from 'jose';
import twilio from 'twilio';
import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';
import { User } from '@yatrasarthi/types';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'yatrasarthi_jwt_secret_token_secure_key_2026_prod'
);

const COOKIE_NAME = 'yatrasarthi_session';

// Twilio Verify Client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;
export const VERIFY_SERVICE_SID = verifyServiceSid;

export interface TokenPayload {
  sub: string;      // userId
  phone: string;
  exp?: number;
}

/**
 * Sign a 7-day JWT token
 */
export async function signSessionToken(payload: { userId: string; phone: string }): Promise<string> {
  return await new SignJWT({ sub: payload.userId, phone: payload.phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token
 */
export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      phone: payload.phone as string,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Get the currently authenticated user from cookies or Authorization header
 */
export async function getSessionUser(request?: Request): Promise<User | null> {
  try {
    let token: string | undefined;

    // Check Authorization header first if request provided
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Fall back to cookie
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }

    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.sub) return null;

    const client = await clientPromise;
    const db = client.db();

    let userDoc = null;
    if (ObjectId.isValid(payload.sub)) {
      userDoc = await db.collection('users').findOne({ _id: new ObjectId(payload.sub) });
    } else {
      userDoc = await db.collection('users').findOne({ id: payload.sub });
    }

    if (!userDoc) return null;

    return {
      id: userDoc._id.toString(),
      phone: userDoc.phone,
      name: userDoc.name || 'Traveler',
      whatsappOptIn: !!userDoc.whatsappOptIn,
      notificationPrefs: userDoc.notificationPrefs || {
        disruptionAlerts: 'on',
        phantomWarnings: true,
        paymentRequests: true,
        groupActivity: true,
      },
      emergencyContacts: userDoc.emergencyContacts || [],
      subscription: userDoc.subscription || { tier: 'free' },
      createdAt: userDoc.createdAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting session user:', error);
    return null;
  }
}

/**
 * Format phone number to E.164 (defaults to Indian +91 if 10 digits)
 */
export function formatToE164(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return `+${cleaned}`;
}
