'use client'

import { useState } from 'react'

interface Stats {
  totalUsers: number
  proUsers: number
  totalAnalyses: number
  freeUsed: number
  totalViews: number
  uniqueVisitors: number
  viewsToday: number
  uniqueToday: number
  viewsByDay: { date: string; views: number; unique_visitors: number }[]
  apiByModel: { model: string; tier: string; calls: number }[]
  apiByModelToday: { model: string; tier: string; calls: number }[]
  apiByDay: { date: string; calls: number }[]
  recentUsers: User[]
}

interface StripeConfig {
  stripeConfigured: boolean
  stripePriceId: string | null
  stripeMode: string
  priceAmount: string
  priceCurrency: string
}

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: number
}

export default function AdminPage() {
  const [secret,  setSecret]  = useState('')
  const [authed,  setAuthed]  = useState(false)
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [stripe,  setStripe]  = useState<StripeConfig | null>(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [roleMsg, setRoleMsg] = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const [statsRes, stripeRes] = await Promise.all([
        fetch('/api/admin/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret }),
        }),
        fetch('/api/admin/stripe-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret }),
        }),
      ])
      const statsData  = await statsRes.json()
      const stripeData = await stripeRes.json()
      if (!statsRes.ok) throw new Error(statsData.error || 'Unauthorized')
      setStats(statsData)
      setStripe(stripeData)
      setAuthed(true)
    } catch (e: any) {
      setError(e.message)
      setSecret('')   // clear password field on failure
    } finally {
      setLoading(false)
    }
  }

  async function refreshStats() {
    const [statsRes, stripeRes] = await Promise.all([
      fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      }),
      fetch('/api/admin/stripe-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      }),
    ])
    if (statsRes.ok)  setStats(await statsRes.json())
    if (stripeRes.ok) setStripe(await stripeRes.json())
  }

  async function setRole(userId: string, role: string) {
    setRoleMsg('')
    const res  = await fetch('/api/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, userId, role }),
    })
    const data = await res.json()
    if (res.ok) {
      setRoleMsg(`Updated ${data.user.email} → ${role}`)
      refreshStats()
    } else {
      setRoleMsg(`Error: ${data.error}`)
    }
  }

  if (!authed) {
    return (
      <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f1117' }}>
        <div style={{ width:360 }}>
          <h1 style={{ color:'#fff', fontSize:22, fontWeight:700, marginBottom:24, textAlign:'center' }}>
            🔐 Operations Dashboard
          </h1>
          <form onSubmit={login} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <input
              type="password" value={secret} onChange={e => setSecret(e.target.value)}
              placeholder="Admin secret" required
              style={{ padding:'12px 16px', borderRadius:10, border:'1px solid #334155', background:'#1e293b', color:'#fff', fontSize:15, outline:'none' }}
            />
            {error && (
              <p style={{
                color: error.includes('locked') || error.includes('Too many') ? '#fbbf24' : '#f87171',
                fontSize:13,
                padding:'8px 12px',
                background: error.includes('locked') || error.includes('Too many') ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                borderRadius:8,
                border: `1px solid ${error.includes('locked') || error.includes('Too many') ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
              }}>
                {error.includes('locked') || error.includes('Too many') ? '🔒 ' : '⚠️ '}{error}
              </p>
            )}
            <button type="submit" disabled={loading}
              style={{ padding:'12px', borderRadius:10, background:'#6366f1', color:'#fff', border:'none', cursor:'pointer', fontSize:15, fontWeight:600 }}>
              {loading ? 'Checking...' : 'Enter'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth:960, margin:'0 auto', padding:'40px 24px', background:'#0f1117', minHeight:'100vh' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32 }}>
        <h1 style={{ color:'#fff', fontSize:26, fontWeight:700 }}>⚙️ Operations Dashboard</h1>
        <button onClick={refreshStats} style={{ padding:'8px 16px', borderRadius:8, background:'#1e293b', color:'#94a3b8', border:'1px solid #334155', cursor:'pointer', fontSize:13 }}>
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginBottom:24 }}>
            {[
              { label:'Total users',      value: stats.totalUsers },
              { label:'Pro users',        value: stats.proUsers },
              { label:'Total analyses',   value: stats.totalAnalyses },
              { label:'Free tier used',   value: stats.freeUsed },
            ].map(s => (
              <div key={s.label} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:'20px 24px' }}>
                <p style={{ color:'#64748b', fontSize:12, marginBottom:6 }}>{s.label}</p>
                <p style={{ color:'#fff', fontSize:28, fontWeight:700 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Page view stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginBottom:24 }}>
            {[
              { label:'Total page views',    value: stats.totalViews,    sub: 'all time' },
              { label:'Unique visitors',     value: stats.uniqueVisitors, sub: 'all time' },
              { label:'Views today',         value: stats.viewsToday,    sub: 'today' },
              { label:'Unique today',        value: stats.uniqueToday,   sub: 'today' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:12, padding:'20px 24px' }}>
                <p style={{ color:'#6366f1', fontSize:12, marginBottom:6 }}>{s.label}</p>
                <p style={{ color:'#fff', fontSize:28, fontWeight:700 }}>{s.value}</p>
                <p style={{ color:'#475569', fontSize:11, marginTop:4 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* 7-day views chart */}
          {stats.viewsByDay.length > 0 && (
            <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:16, padding:24, marginBottom:24 }}>
              <h2 style={{ color:'#fff', fontSize:17, fontWeight:600, marginBottom:16 }}>Last 7 days</h2>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:80 }}>
                {stats.viewsByDay.map(day => {
                  const maxViews = Math.max(...stats.viewsByDay.map(d => d.views), 1)
                  const h = Math.max(4, Math.round((day.views / maxViews) * 80))
                  return (
                    <div key={day.date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <span style={{ color:'#64748b', fontSize:10 }}>{day.views}</span>
                      <div title={`${day.views} views, ${day.unique_visitors} unique`}
                        style={{ width:'100%', height:h, background:'#6366f1', borderRadius:4, opacity:0.8 }} />
                      <span style={{ color:'#475569', fontSize:9 }}>{day.date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', gap:16, marginTop:12 }}>
                <span style={{ color:'#64748b', fontSize:12 }}>
                  Total: <strong style={{ color:'#fff' }}>{stats.viewsByDay.reduce((s, d) => s + d.views, 0)}</strong> views
                </span>
                <span style={{ color:'#64748b', fontSize:12 }}>
                  Unique: <strong style={{ color:'#a5b4fc' }}>{stats.viewsByDay.reduce((s, d) => s + d.unique_visitors, 0)}</strong> visitors
                </span>
              </div>
            </div>
          )}

          {/* Role message */}
          {roleMsg && (
            <div style={{ marginBottom:20, padding:'10px 16px', background:'rgba(99,102,241,0.1)', border:'1px solid #6366f1', borderRadius:8, color:'#a5b4fc', fontSize:13 }}>
              {roleMsg}
            </div>
          )}

          {/* AI API usage */}
          <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:16, padding:24, marginBottom:24 }}>
            <h2 style={{ color:'#fff', fontSize:17, fontWeight:600, marginBottom:16 }}>AI API calls</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

              {/* All time per model */}
              <div>
                <p style={{ color:'#64748b', fontSize:12, marginBottom:12 }}>All time — by model</p>
                {['gemini','haiku','claude'].map(model => {
                  const free = stats.apiByModel.find(r => r.model === model && r.tier === 'free')?.calls ?? 0
                  const pro  = stats.apiByModel.find(r => r.model === model && r.tier === 'pro')?.calls ?? 0
                  const total = free + pro
                  const modelColors: Record<string, string> = { gemini:'#10b981', haiku:'#f59e0b', claude:'#6366f1' }
                  const modelLabels: Record<string, string> = { gemini:'Gemini 2.5 Flash', haiku:'Claude Haiku 4.5', claude:'Claude Sonnet 4' }
                  return (
                    <div key={model} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'rgba(15,23,42,0.6)', borderRadius:10, marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background: modelColors[model], flexShrink:0 }} />
                        <span style={{ color:'#e2e8f0', fontSize:13 }}>{modelLabels[model]}</span>
                      </div>
                      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                        <span style={{ color:'#64748b', fontSize:11 }}>free: {free}</span>
                        <span style={{ color:'#64748b', fontSize:11 }}>pro: {pro}</span>
                        <span style={{ color:'#fff', fontSize:15, fontWeight:700, minWidth:32, textAlign:'right' }}>{total}</span>
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop:4, padding:'6px 14px', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#64748b', fontSize:12 }}>Total calls</span>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>
                    {stats.apiByModel.reduce((s, r) => s + r.calls, 0)}
                  </span>
                </div>
              </div>

              {/* Today per model */}
              <div>
                <p style={{ color:'#64748b', fontSize:12, marginBottom:12 }}>Today — by model</p>
                {['gemini','haiku','claude'].map(model => {
                  const free = stats.apiByModelToday.find(r => r.model === model && r.tier === 'free')?.calls ?? 0
                  const pro  = stats.apiByModelToday.find(r => r.model === model && r.tier === 'pro')?.calls ?? 0
                  const total = free + pro
                  const modelColors: Record<string, string> = { gemini:'#10b981', haiku:'#f59e0b', claude:'#6366f1' }
                  const modelLabels: Record<string, string> = { gemini:'Gemini 2.5 Flash', haiku:'Claude Haiku 4.5', claude:'Claude Sonnet 4' }
                  return (
                    <div key={model} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'rgba(15,23,42,0.6)', borderRadius:10, marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background: modelColors[model], flexShrink:0 }} />
                        <span style={{ color:'#e2e8f0', fontSize:13 }}>{modelLabels[model]}</span>
                      </div>
                      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                        <span style={{ color:'#64748b', fontSize:11 }}>free: {free}</span>
                        <span style={{ color:'#64748b', fontSize:11 }}>pro: {pro}</span>
                        <span style={{ color:'#fff', fontSize:15, fontWeight:700, minWidth:32, textAlign:'right' }}>{total}</span>
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop:4, padding:'6px 14px', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#64748b', fontSize:12 }}>Today total</span>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>
                    {stats.apiByModelToday.reduce((s, r) => s + r.calls, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* 7-day API call bar chart */}
            {stats.apiByDay.length > 0 && (
              <div style={{ marginTop:20 }}>
                <p style={{ color:'#64748b', fontSize:12, marginBottom:8 }}>Last 7 days — total calls/day</p>
                <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:60 }}>
                  {stats.apiByDay.map(day => {
                    const max = Math.max(...stats.apiByDay.map(d => d.calls), 1)
                    const h   = Math.max(4, Math.round((day.calls / max) * 60))
                    return (
                      <div key={day.date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <span style={{ color:'#64748b', fontSize:10 }}>{day.calls}</span>
                        <div title={`${day.calls} calls`}
                          style={{ width:'100%', height:h, background:'#10b981', borderRadius:4, opacity:0.8 }} />
                        <span style={{ color:'#475569', fontSize:9 }}>{day.date.slice(5)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stripe config */}
          <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:16, padding:24, marginBottom:24 }}>
            <h2 style={{ color:'#fff', fontSize:17, fontWeight:600, marginBottom:16 }}>Stripe payments</h2>
            {stripe ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16 }}>
                <div style={{ padding:'16px 20px', background:'rgba(15,23,42,0.6)', borderRadius:10 }}>
                  <p style={{ color:'#64748b', fontSize:12, marginBottom:6 }}>Status</p>
                  <p style={{ fontSize:16, fontWeight:600, color: stripe.stripeConfigured ? '#10b981' : '#ef4444' }}>
                    {stripe.stripeConfigured ? 'Configured' : 'Not configured'}
                  </p>
                  {stripe.stripeConfigured && (
                    <p style={{ color:'#64748b', fontSize:11, marginTop:4 }}>
                      Mode: <span style={{ color: stripe.stripeMode === 'live' ? '#10b981' : '#f59e0b' }}>{stripe.stripeMode}</span>
                    </p>
                  )}
                </div>
                <div style={{ padding:'16px 20px', background:'rgba(15,23,42,0.6)', borderRadius:10 }}>
                  <p style={{ color:'#64748b', fontSize:12, marginBottom:6 }}>Pro subscription price</p>
                  <p style={{ fontSize:22, fontWeight:700, color:'#fff' }}>
                    {stripe.priceCurrency === 'EUR' ? '€' : stripe.priceCurrency}{stripe.priceAmount}
                    <span style={{ color:'#64748b', fontSize:13, fontWeight:400 }}>/month</span>
                  </p>
                  {stripe.stripePriceId && (
                    <p style={{ color:'#475569', fontSize:10, marginTop:4, fontFamily:'monospace' }}>{stripe.stripePriceId}</p>
                  )}
                </div>
                {!stripe.stripeConfigured && (
                  <div style={{ gridColumn:'1/-1', padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8 }}>
                    <p style={{ color:'#fca5a5', fontSize:13 }}>
                      Add STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET to Vercel environment variables to enable payments.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color:'#475569', fontSize:13 }}>Loading...</p>
            )}
          </div>

          {/* Recent users table */}
          <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:16, padding:24 }}>
            <h2 style={{ color:'#fff', fontSize:17, fontWeight:600, marginBottom:16 }}>Recent users</h2>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #334155', color:'#64748b', textAlign:'left' }}>
                  <th style={{ paddingBottom:10, paddingRight:16 }}>Name</th>
                  <th style={{ paddingBottom:10, paddingRight:16 }}>Email</th>
                  <th style={{ paddingBottom:10, paddingRight:16 }}>Role</th>
                  <th style={{ paddingBottom:10, paddingRight:16 }}>Joined</th>
                  <th style={{ paddingBottom:10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom:'1px solid #1e293b' }}>
                    <td style={{ padding:'10px 16px 10px 0', color:'#e2e8f0' }}>{u.name || '—'}</td>
                    <td style={{ padding:'10px 16px 10px 0', color:'#94a3b8' }}>{u.email}</td>
                    <td style={{ padding:'10px 16px 10px 0' }}>
                      <span style={{
                        padding:'2px 10px', borderRadius:9999, fontSize:12, fontWeight:500,
                        background: u.role === 'pro' ? 'rgba(99,102,241,0.2)' : u.role === 'admin' ? 'rgba(251,191,36,0.2)' : 'rgba(100,116,139,0.2)',
                        color:      u.role === 'pro' ? '#a5b4fc' : u.role === 'admin' ? '#fbbf24' : '#94a3b8',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding:'10px 16px 10px 0', color:'#64748b', fontSize:12 }}>
                      {new Date(u.createdAt * 1000).toLocaleDateString()}
                    </td>
                    <td style={{ padding:'10px 0' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        {u.role !== 'pro' && (
                          <button onClick={() => setRole(u.id, 'pro')}
                            style={{ padding:'3px 10px', borderRadius:6, background:'rgba(99,102,241,0.2)', color:'#a5b4fc', border:'1px solid #6366f1', cursor:'pointer', fontSize:12 }}>
                            → Pro
                          </button>
                        )}
                        {u.role !== 'free' && (
                          <button onClick={() => setRole(u.id, 'free')}
                            style={{ padding:'3px 10px', borderRadius:6, background:'rgba(100,116,139,0.2)', color:'#94a3b8', border:'1px solid #475569', cursor:'pointer', fontSize:12 }}>
                            → Free
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
