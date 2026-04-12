'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { getT } from '@/lib/i18n'
import type { AnalysisResult, Language } from '@/lib/types'

function UpgradeButton() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong')
        setLoading(false)
      }
    } catch {
      setError('Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleUpgrade} disabled={loading} style={{
        padding:'10px 24px', borderRadius:10, background:'#6366f1',
        color:'#fff', border:'none', cursor: loading ? 'wait' : 'pointer', fontWeight:600,
      }}>
        {loading ? 'Redirecting to payment...' : 'Upgrade to Pro — €4/month'}
      </button>
      {error && <p style={{ color:'#f87171', fontSize:13, marginTop:8 }}>{error}</p>}
      <p style={{ color:'#475569', fontSize:12, marginTop:8 }}>
        Secure payment via Stripe · Cancel anytime
      </p>
    </div>
  )
}

interface Analysis {
  id: string
  fileName: string
  provider: string
  createdAt: number
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const isPro    = (session?.user as any)?.role === 'pro' || (session?.user as any)?.role === 'admin'
  const storageOptIn = (session?.user as any)?.storageOptIn as boolean

  const [analyses,      setAnalyses]      = useState<Analysis[]>([])
  const [optIn,         setOptIn]         = useState(false)
  const [savingOptIn,   setSavingOptIn]   = useState(false)
  const [deleteMsg,     setDeleteMsg]     = useState('')
  const [stripeMsg,     setStripeMsg]     = useState('')
  const [viewedAnalysis, setViewedAnalysis] = useState<{ result: AnalysisResult; fileName: string } | null>(null)
  const [loadingId,     setLoadingId]     = useState<string | null>(null)
  const lang: Language = 'en'
  const t = getT(lang)

  async function viewAnalysis(id: string, fileName: string) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/user/analyses?id=${id}`)
      const data = await res.json()
      if (data.result) setViewedAnalysis({ result: data.result, fileName })
    } catch {}
    setLoadingId(null)
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (storageOptIn !== undefined) setOptIn(storageOptIn)
  }, [storageOptIn])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === 'true') setStripeMsg('🎉 Welcome to Pro! Your account has been upgraded.')
    if (params.get('cancelled') === 'true') setStripeMsg('Payment cancelled — you can upgrade anytime.')
  }, [])

  useEffect(() => {
    if (isPro) {
      fetch('/api/user/analyses')
        .then(r => r.json())
        .then(d => setAnalyses(d.analyses ?? []))
        .catch(() => {})
    }
  }, [isPro])

  async function toggleOptIn() {
    setSavingOptIn(true)
    const newVal = !optIn
    await fetch('/api/user/analyses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageOptIn: newVal }),
    })
    setOptIn(newVal)
    setSavingOptIn(false)
  }

  async function deleteAnalysis(id: string) {
    await fetch(`/api/user/analyses?id=${id}`, { method: 'DELETE' })
    setAnalyses(prev => prev.filter(a => a.id !== id))
  }

  async function deleteAllAnalyses() {
    if (!confirm('Delete all saved analyses? This cannot be undone.')) return
    await fetch('/api/user/analyses?all=true', { method: 'DELETE' })
    setAnalyses([])
    setDeleteMsg('All analyses deleted.')
  }

  if (status === 'loading') return null

  return (
    <main style={{ maxWidth:720, margin:'0 auto', padding:'40px 24px', minHeight:'100vh' }}>
      <div style={{ display:'flex', gap:16, alignItems:'center' }}>
        <a href="/" style={{ color:'#6366f1', fontSize:14, textDecoration:'none' }}>← Back to app</a>
        <a href="/feedback" style={{ color:'#475569', fontSize:14, textDecoration:'none' }}>💬 Feedback & Support</a>
      </div>

      <h1 style={{ color:'#fff', fontSize:26, fontWeight:700, marginTop:24, marginBottom:4 }}>My Account</h1>
      <p style={{ color:'#64748b', fontSize:14, marginBottom:32 }}>
        {session?.user?.email} ·{' '}
        <span style={{ color: isPro ? '#a5b4fc' : '#64748b', fontWeight:500 }}>
          {isPro ? '⭐ Pro' : '🆓 Free'}
        </span>
      </p>

      {stripeMsg && (
        <div style={{ marginBottom:24, padding:'12px 20px', background: stripeMsg.startsWith('🎉') ? 'rgba(99,102,241,0.1)' : 'rgba(100,116,139,0.1)', border:`1px solid ${stripeMsg.startsWith('🎉') ? '#6366f1' : '#475569'}`, borderRadius:12 }}>
          <p style={{ color: stripeMsg.startsWith('🎉') ? '#a5b4fc' : '#94a3b8', fontSize:14 }}>{stripeMsg}</p>
        </div>
      )}

      {/* Storage opt-in — Pro only */}
      {isPro && (
        <Section title="Analysis history">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <p style={{ color:'#e2e8f0', marginBottom:4 }}>Save analyses for later review</p>
              <p style={{ color:'#64748b', fontSize:13 }}>Off by default. Your financial data is never stored without your consent.</p>
            </div>
            <button onClick={toggleOptIn} disabled={savingOptIn} style={{
              padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:500,
              background: optIn ? '#6366f1' : '#334155',
              color: optIn ? '#fff' : '#94a3b8',
            }}>
              {savingOptIn ? '...' : optIn ? 'On' : 'Off'}
            </button>
          </div>

          {optIn && analyses.length > 0 && (
            <>
              {deleteMsg && <p style={{ color:'#94a3b8', fontSize:13, marginBottom:12 }}>{deleteMsg}</p>}
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #334155', color:'#64748b', textAlign:'left' }}>
                    <th style={{ paddingBottom:8, paddingRight:16 }}>File</th>
                    <th style={{ paddingBottom:8, paddingRight:16 }}>Date</th>
                    <th style={{ paddingBottom:8, paddingRight:16 }}>Model</th>
                    <th style={{ paddingBottom:8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map(a => {
                    const isViewed = viewedAnalysis?.fileName === a.fileName
                    const isLoading = loadingId === a.id
                    return (
                      <tr key={a.id} style={{ borderBottom:'1px solid #1e293b', background: isViewed ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                        <td style={{ padding:'10px 16px 10px 0' }}>
                          <button
                            onClick={() => viewAnalysis(a.id, a.fileName)}
                            style={{ background:'none', border:'none', cursor:'pointer', color: isViewed ? '#a5b4fc' : '#e2e8f0', textAlign:'left', fontSize:14, padding:0, textDecoration: isViewed ? 'none' : 'underline', textDecorationColor:'#475569' }}
                          >
                            {isLoading ? '⏳ Loading...' : (isViewed ? '▼ ' : '▶ ') + a.fileName}
                          </button>
                        </td>
                        <td style={{ padding:'10px 16px 10px 0', color:'#64748b', fontSize:12 }}>
                          {new Date(a.createdAt * 1000).toLocaleDateString()}
                        </td>
                        <td style={{ padding:'10px 16px 10px 0', color:'#64748b', fontSize:12 }}>{a.provider}</td>
                        <td style={{ padding:'10px 0' }}>
                          <button onClick={() => deleteAnalysis(a.id)}
                            style={{ color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontSize:12 }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Inline dashboard viewer */}
              {viewedAnalysis && (
                <div style={{ marginTop:24, borderTop:'1px solid #334155', paddingTop:24 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <p style={{ color:'#a5b4fc', fontWeight:600, fontSize:15 }}>📊 {viewedAnalysis.fileName}</p>
                    <button onClick={() => setViewedAnalysis(null)}
                      style={{ color:'#64748b', background:'none', border:'1px solid #334155', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12 }}>
                      ✕ Close
                    </button>
                  </div>
                  <Dashboard data={viewedAnalysis.result} t={t} lang={lang} />
                </div>
              )}

              <button onClick={deleteAllAnalyses}
                style={{ marginTop:16, color:'#ef4444', background:'none', border:'1px solid #ef4444', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13 }}>
                Delete all analyses
              </button>
            </>
          )}

          {optIn && analyses.length === 0 && (
            <p style={{ color:'#475569', fontSize:13 }}>No saved analyses yet. Upload a statement to get started.</p>
          )}
        </Section>
      )}

      {/* Upgrade prompt for free users */}
      {!isPro && (
        <Section title="Upgrade to Pro">
          <p style={{ color:'#94a3b8', marginBottom:16 }}>
            Get unlimited analyses, multi-file upload, the Better model, and analysis history for €4/month.
          </p>
          <UpgradeButton />
        </Section>
      )}

      {/* Danger zone */}
      <Section title="Account">
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <button onClick={() => signOut({ callbackUrl: '/' })}
            style={{ padding:'8px 16px', borderRadius:8, background:'transparent', color:'#94a3b8', border:'1px solid #334155', cursor:'pointer', fontSize:13 }}>
            Sign out
          </button>
        </div>
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom:32, background:'#1e293b', border:'1px solid #334155', borderRadius:16, padding:24 }}>
      <h2 style={{ color:'#fff', fontSize:16, fontWeight:600, marginBottom:16 }}>{title}</h2>
      {children}
    </section>
  )
}
