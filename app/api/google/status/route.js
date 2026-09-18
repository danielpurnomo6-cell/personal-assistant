import { NextResponse } from 'next/server';
import { isGoogleConfigured, getAuthedClient, getAccountEmail, getStoredTokens } from '../../../lib/google';

// GET /api/google/status — { connected, email } atau { connected: false }.
export async function GET(req) {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json({ connected: false, configured: false });
    }
    const oauth = await getAuthedClient(req.nextUrl.origin);
    const stored = await getStoredTokens().catch(() => null);
    const email = stored?.email || (await getAccountEmail(oauth));
    return NextResponse.json({ connected: true, configured: true, email: email || null });
  } catch (e) {
    return NextResponse.json({ connected: false, configured: isGoogleConfigured() });
  }
}
