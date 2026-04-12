'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import UploadZone from '@/components/UploadZone'
import Dashboard from '@/components/Dashboard'
import type { AnalysisResult, Language } from '@/lib/types'
import { getT } from '@/lib/i18n'

type Stage = 'idle' | 'analyze' | 'done' | 'error'

const PRO_MODELS = [
  { value: 'auto',   label: '⚡ Auto',    badge: 'Selects best model by file size' },
  { value: 'claude', label: '✨ Better',  badge: 'Always uses highest accuracy model' },
]

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id: string) => void
      remove: (id: string) => void
    }
  }
}

export default function Home() {
  const { data: session } = useSession()
  const isPro  = (session?.user as any)?.role === 'pro' || (session?.user as any)?.role === 'admin'

  const [lang,          setLang]         = useState<Language>('en')
  const [model,         setModel]        = useState<'auto' | 'claude'>('auto')
  const [stage,         setStage]        = useState<Stage>('idle')
  const [error,         setError]        = useState('')
  const [upgrade,       setUpgrade]      = useState(false)
  const [result,        setResult]       = useState<AnalysisResult | null>(null)
  const [provMeta,      setProvMeta]     = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileId  = useRef<string>('')

  const t = getT(lang)

  // Load Turnstile script + render widget (free users only)
  useEffect(() => {
    if (isPro || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile) return
      if (turnstileId.current) return   // already rendered
      turnstileId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        theme: 'dark',
        size: 'normal',
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.onload = renderWidget
      document.head.appendChild(script)
    }

    return () => {
      if (turnstileId.current && window.turnstile) {
        window.turnstile.remove(turnstileId.current)
        turnstileId.current = ''
      }
    }
  }, [isPro])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fa_lang') as Language | null
      const valid: Language[] = ['en','cs','de','fr','it','pt','pl','hu']
      if (saved && valid.includes(saved)) setLang(saved)
    } catch {}
    // Track page view silently — fire and forget
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/' }),
    }).catch(() => {})
  }, [])

  const switchLang = (l: Language) => {
    setLang(l)
    try { localStorage.setItem('fa_lang', l) } catch {}
  }

  async function handleFiles(files: File[]) {
    setStage('analyze')
    setError('')
    setResult(null)
    setUpgrade(false)
    setProvMeta('')

    try {
      const form = new FormData()
      files.forEach(f => form.append('file', f))
      form.append('provider', isPro && model === 'claude' ? 'claude' : 'gemini')
      form.append('language', lang)

      // Honeypot — empty for real users, bots may fill it
      form.append('_email_confirm', '')

      // Turnstile token — only needed for free (anonymous) users
      if (!isPro && turnstileToken) {
        form.append('cf-turnstile-response', turnstileToken)
      }

      const res  = await fetch('/api/analyze', { method: 'POST', body: form })
      const data = await res.json()

      // Reset Turnstile after use
      if (!isPro && turnstileId.current && window.turnstile) {
        window.turnstile.reset(turnstileId.current)
        setTurnstileToken('')
      }

      if (res.status === 403 && data.upgrade) {
        setUpgrade(true)
        setError(data.error || 'error.freeUsed')
        setStage('error')
        return
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || t.errorAnalyze)
      }

      // Map actual provider used to user-friendly label
      const usedProvider = data._meta?.provider ?? 'gemini'
      const providerLabel: Record<string, string> = {
        gemini: 'Standard', haiku: 'Standard+', claude: 'Better'
      }
      setProvMeta(data._meta?.tier === 'pro'
        ? (model === 'claude' ? 'Better' : `Auto (${providerLabel[usedProvider] ?? 'Standard'})`)
        : 'Standard')
      setResult(data as AnalysisResult)
      setStage('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStage('error')
    }
  }

  const loading = stage === 'analyze'

  return (
    <main style={{ maxWidth:960, margin:'0 auto', padding:'40px 24px' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:36 }}>
        <div>
          <h1 style={{ fontSize:32, fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>
            💳 {t.appName}
          </h1>
          <p style={{ color:'#94a3b8', marginTop:8, fontSize:16 }}>{t.appSubtitle}</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end' }}>
          {/* Language toggle */}
          <div style={{ display:'flex', gap:3, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:280 }}>
            {([
              { code:'en', flag:'🇬🇧' }, { code:'cs', flag:'🇨🇿' }, { code:'de', flag:'🇩🇪' },
              { code:'fr', flag:'🇫🇷' }, { code:'it', flag:'🇮🇹' }, { code:'pt', flag:'🇵🇹' },
              { code:'pl', flag:'🇵🇱' }, { code:'hu', flag:'🇭🇺' },
            ] as {code: Language, flag: string}[]).map(({ code, flag }) => (
              <button key={code} onClick={() => switchLang(code)} title={code.toUpperCase()} style={{
                padding:'4px 7px', borderRadius:7, border: lang === code ? '1px solid #6366f1' : '1px solid transparent',
                cursor:'pointer', fontSize:16, lineHeight:1, color:'#94a3b8',
                background: lang === code ? 'rgba(99,102,241,0.2)' : 'transparent',
              }}>
                {flag}
              </button>
            ))}
          </div>

          {/* Auth button */}
          {session ? (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {session.user?.image && (
                <img src={session.user.image} alt="" style={{ width:28, height:28, borderRadius:'50%' }} />
              )}
              <a href="/account" style={{
                color: isPro ? '#a5b4fc' : '#94a3b8',
                fontSize:13, textDecoration:'none', fontWeight:500,
              }}>
                {isPro ? '⭐ Pro' : '🆓 Free'}
              </a>
              <button onClick={() => signOut()} style={{ color:'#64748b', background:'none', border:'none', cursor:'pointer', fontSize:12 }}>
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={() => signIn()} style={{
              padding:'7px 16px', borderRadius:8, border:'1px solid #6366f1',
              background:'rgba(99,102,241,0.15)', color:'#a5b4fc', fontSize:13, cursor:'pointer',
            }}>
              Sign in / Register
            </button>
          )}

          {/* Model selector — Pro only */}
          {isPro && (
            <div style={{ display:'flex', gap:6 }}>
              {PRO_MODELS.map(m => (
                <button key={m.value} onClick={() => setModel(m.value as any)} title={m.badge} style={{
                  padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer',
                  border: `1px solid ${model === m.value ? '#6366f1' : '#334155'}`,
                  background: model === m.value ? 'rgba(99,102,241,0.15)' : 'rgba(30,41,59,0.6)',
                  color: model === m.value ? '#a5b4fc' : '#64748b',
                }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Free tier banner */}
      {!session && (
        <div style={{ marginBottom:24, padding:'12px 20px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'#94a3b8', fontSize:14 }}>
            🆓 1 free analysis · No account needed
          </span>
          <button onClick={() => signIn()} style={{ color:'#a5b4fc', background:'none', border:'none', cursor:'pointer', fontSize:13, textDecoration:'underline' }}>
            Sign in for more →
          </button>
        </div>
      )}

      {/* Hero section — shown only on idle state (no analysis yet) */}
      {stage === 'idle' && (
        <div style={{ marginBottom:32 }}>
          {/* Feature pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20, justifyContent:'center' }}>
            {[t.heroFeat1, t.heroFeat2, t.heroFeat3, t.heroFeat4, t.heroFeat5].map((label, i) => (
              <span key={i} style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'5px 14px', borderRadius:9999, fontSize:13,
                background:'rgba(30,41,59,0.8)', border:'1px solid #334155', color:'#94a3b8',
              }}>
                {['📊','🔄','📈','🔁','💡'][i]} {label}
              </span>
            ))}
          </div>

          {/* Description */}
          <p style={{
            color:'#64748b', fontSize:14, lineHeight:1.7, textAlign:'center',
            maxWidth:560, margin:'0 auto', padding:'0 8px',
          }}>
            {t.heroDesc}
          </p>

          {/* How it works — 3 steps */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginTop:24, maxWidth:600, margin:'24px auto 0' }}>
            {[
              { icon:'📤', title: t.heroStep1Title, desc: t.heroStep1Desc },
              { icon:'⚡', title: t.heroStep2Title, desc: t.heroStep2Desc },
              { icon:'📊', title: t.heroStep3Title, desc: t.heroStep3Desc },
            ].map((s, i) => (
              <div key={i} style={{ textAlign:'center', padding:'16px 12px', background:'rgba(15,23,42,0.4)', border:'1px solid #1e293b', borderRadius:12 }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                <p style={{ color:'#e2e8f0', fontSize:13, fontWeight:500, marginBottom:4 }}>{s.title}</p>
                <p style={{ color:'#475569', fontSize:12 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <UploadZone onFiles={handleFiles} loading={loading} t={t} isPro={isPro} />

      {/* Cloudflare Turnstile widget — shown to anonymous free users only */}
      {!isPro && !session && stage === 'idle' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, marginTop:16 }}>
          <div ref={turnstileRef} />
          {!turnstileToken && (
            <p style={{ color:'#64748b', fontSize:12 }}>Complete the security check above to analyse</p>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ marginTop:32, textAlign:'center' }}>
          <div style={{ display:'inline-block', width:32, height:32, border:'4px solid #6366f1', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          <p style={{ color:'#94a3b8', fontSize:14, marginTop:12 }}>{t.statusAnalyze}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error / Upgrade prompt */}
      {stage === 'error' && (
        <div style={{ marginTop:32, background: upgrade ? 'rgba(99,102,241,0.1)' : 'rgba(127,29,29,0.3)', border:`1px solid ${upgrade ? '#6366f1' : '#991b1b'}`, borderRadius:16, padding:24, textAlign:'center' }}>
          {upgrade ? (
            <>
              <p style={{ color:'#a5b4fc', fontWeight:600, fontSize:18 }}>You've used your free analysis</p>
              <p style={{ color:'#94a3b8', marginTop:8 }}>Sign in and upgrade to Pro for unlimited analyses, multi-file upload, history and more.</p>
              <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:20 }}>
                <button onClick={() => signIn()} style={{ padding:'10px 24px', borderRadius:10, background:'#6366f1', color:'#fff', border:'none', cursor:'pointer', fontWeight:600 }}>
                  Sign in / Register
                </button>
                <button onClick={() => setStage('idle')} style={{ padding:'10px 24px', borderRadius:10, background:'transparent', color:'#94a3b8', border:'1px solid #334155', cursor:'pointer' }}>
                  Back
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color:'#fca5a5', fontWeight:500 }}>⚠️ {error}</p>
              <button onClick={() => setStage('idle')} style={{ marginTop:16, color:'#94a3b8', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontSize:14 }}>
                {t.tryAgain}
              </button>
            </>
          )}
        </div>
      )}

      {result && stage === 'done' && (
        <Dashboard
          data={result}
          t={t}
          lang={lang}
          providerName={provMeta}
          autoInfo=""
        />
      )}
    </main>
  )
}
