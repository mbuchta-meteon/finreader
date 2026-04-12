'use client'

import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const TYPES = [
  { value: 'feedback',  label: '💬 General Feedback', desc: 'Share your thoughts or suggestions' },
  { value: 'bug',       label: '🐛 Bug Report',        desc: 'Something is not working correctly' },
  { value: 'feature',   label: '✨ Feature Request',   desc: 'An idea for something new' },
  { value: 'complaint', label: '⚠️ Complaint',         desc: 'Something you are unhappy about' },
]

export default function FeedbackPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [type,    setType]    = useState('feedback')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSending(true)
    setError('')
    try {
      const res  = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, subject: subject.trim(), message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ color:'#64748b', textAlign:'center' }}>Loading…</p>
        </div>
      </main>
    )
  }

  // Not signed in
  if (!session) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:8 }}>Sign in required</h1>
            <p style={{ color:'#64748b', fontSize:14, lineHeight:1.6 }}>
              Feedback is available for registered users only.<br/>
              Please sign in to continue.
            </p>
          </div>
          <button onClick={() => signIn()} style={primaryBtn}>
            Sign in
          </button>
          <button onClick={() => router.push('/')} style={ghostBtn}>
            ← Back to home
          </button>
        </div>
      </main>
    )
  }

  // Success state
  if (sent) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🙏</div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:8 }}>Thank you!</h1>
            <p style={{ color:'#94a3b8', fontSize:14, lineHeight:1.7, marginBottom:24 }}>
              Your message has been sent. We read every piece of feedback and will get back to you if needed.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={() => { setSent(false); setSubject(''); setMessage(''); setType('feedback') }} style={ghostBtn}>
                Send another message
              </button>
              <button onClick={() => router.push('/')} style={primaryBtn}>
                Back to app
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const user = session.user as any
  const charCount = message.length
  const charLimit = 5000

  return (
    <main style={pageStyle}>
      <div style={{ width:'100%', maxWidth:560 }}>

        {/* Header */}
        <div style={{ marginBottom:28, display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => router.push('/')} style={{
            background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20, padding:0, lineHeight:1,
          }}>←</button>
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, color:'#fff', margin:0 }}>Feedback & Support</h1>
            <p style={{ color:'#64748b', fontSize:13, margin:'4px 0 0' }}>
              Signed in as <span style={{ color:'#94a3b8' }}>{user.email}</span>
            </p>
          </div>
        </div>

        {/* Type selector */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)} style={{
              padding:'12px 14px', borderRadius:10, cursor:'pointer', textAlign:'left',
              border: type === t.value ? '1px solid #6366f1' : '1px solid #334155',
              background: type === t.value ? 'rgba(99,102,241,0.12)' : 'rgba(15,23,42,0.6)',
              transition:'all 0.15s',
            }}>
              <div style={{ fontSize:14, fontWeight:500, color: type === t.value ? '#a5b4fc' : '#e2e8f0', marginBottom:3 }}>
                {t.label}
              </div>
              <div style={{ fontSize:11, color:'#475569', lineHeight:1.4 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={labelStyle}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of your message"
              maxLength={120}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Message
              <span style={{ float:'right', color: charCount > charLimit * 0.9 ? '#f87171' : '#475569' }}>
                {charCount}/{charLimit}
              </span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Please describe your feedback, bug, or request in detail. The more context you provide, the better we can help."
              required
              rows={7}
              maxLength={charLimit}
              style={{ ...inputStyle, resize:'vertical', minHeight:140, fontFamily:'inherit' }}
            />
          </div>

          {error && (
            <p style={{
              color:'#f87171', fontSize:13, padding:'8px 12px',
              background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8,
            }}>
              ⚠️ {error}
            </p>
          )}

          <button type="submit" disabled={sending || !subject.trim() || !message.trim()} style={{
            ...primaryBtn,
            opacity: (sending || !subject.trim() || !message.trim()) ? 0.5 : 1,
          }}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </form>

        <p style={{ color:'#334155', fontSize:12, textAlign:'center', marginTop:16 }}>
          We typically respond within 1–2 business days.
        </p>
      </div>
    </main>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '40px 20px',
  background: '#0f1117',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#64748b',
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 6,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid #334155',
  background: '#1e293b',
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '12px 24px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  background: '#6366f1',
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
}

const ghostBtn: React.CSSProperties = {
  width: '100%',
  padding: '11px 24px',
  borderRadius: 10,
  border: '1px solid #334155',
  cursor: 'pointer',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: 14,
}
