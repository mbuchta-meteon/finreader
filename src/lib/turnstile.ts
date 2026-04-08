/**
 * Cloudflare Turnstile server-side token verification.
 * Called from /api/analyze before processing free-tier requests.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // No key configured — skip verification (dev fallback)
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set, skipping verification')
    return true
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    })
    const data = await res.json() as { success: boolean; 'error-codes'?: string[] }
    if (!data.success) {
      console.warn('[turnstile] verification failed:', data['error-codes'])
    }
    return data.success
  } catch (err) {
    console.error('[turnstile] fetch error:', err)
    // On network error fail open (don't block legitimate users)
    return true
  }
}
