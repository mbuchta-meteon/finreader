import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const FEEDBACK_TYPES = ['feedback', 'bug', 'feature', 'complaint'] as const
type FeedbackType = typeof FEEDBACK_TYPES[number]

const TYPE_LABELS: Record<FeedbackType, string> = {
  feedback:  '💬 General Feedback',
  bug:       '🐛 Bug Report',
  feature:   '✨ Feature Request',
  complaint: '⚠️ Complaint',
}

export async function POST(req: NextRequest) {
  // Auth required — registered users only
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const { type, subject, message } = await req.json()

  if (!FEEDBACK_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  if (!subject?.trim() || subject.trim().length < 3) {
    return NextResponse.json({ error: 'Subject too short' }, { status: 400 })
  }
  if (!message?.trim() || message.trim().length < 10) {
    return NextResponse.json({ error: 'Message too short (min 10 chars)' }, { status: 400 })
  }
  if (message.trim().length > 5000) {
    return NextResponse.json({ error: 'Message too long (max 5000 chars)' }, { status: 400 })
  }

  const user   = session.user as any
  const role   = user.role ?? 'free'
  const userId = user.id ?? 'unknown'
  const name   = user.name ?? 'Unknown'
  const email  = user.email

  // Send via Resend
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#6366f1;padding:20px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">${TYPE_LABELS[type as FeedbackType]}</h2>
        <p style="color:#c7d2fe;margin:4px 0 0;font-size:13px">Finance Analyzer — User Feedback</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr>
            <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap">From</td>
            <td style="padding:6px 0;font-size:13px;font-weight:500">${name} &lt;${email}&gt;</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px">User ID</td>
            <td style="padding:6px 0;font-size:13px;font-family:monospace">${userId}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px">Role</td>
            <td style="padding:6px 0;font-size:13px">
              <span style="background:${role === 'pro' ? '#ede9fe' : '#f1f5f9'};color:${role === 'pro' ? '#6d28d9' : '#475569'};padding:2px 8px;border-radius:999px;font-size:12px">
                ${role}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px">Subject</td>
            <td style="padding:6px 0;font-size:13px;font-weight:500">${subject.trim()}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px">Sent at</td>
            <td style="padding:6px 0;font-size:13px">${new Date().toISOString()}</td>
          </tr>
        </table>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px">
          <p style="margin:0;font-size:14px;line-height:1.7;white-space:pre-wrap">${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">
          Reply directly to this email to respond to the user.
        </p>
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'finreader/1.0',
    },
    body: JSON.stringify({
      from:     process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
      to:       ['buchtosik@gmail.com'],
      reply_to: email,
      subject:  `[${TYPE_LABELS[type as FeedbackType]}] ${subject.trim()}`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[feedback] Resend error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
