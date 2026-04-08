'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { AnalysisResult, Language } from '@/lib/types'
import { translateCategory } from '@/lib/types'
import type { Translations } from '@/lib/i18n'

const COLORS = ['#6366f1','#06b6d4','#f59e0b','#10b981','#f43f5e','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16','#a78bfa','#fb7185','#38bdf8','#64748b','#fbbf24','#4ade80']

const card: React.CSSProperties  = { background:'rgba(30,41,59,0.6)', border:'1px solid #334155', borderRadius:16, padding:24 }
const h2: React.CSSProperties    = { color:'#fff', fontSize:17, fontWeight:600, marginBottom:16 }
const lbl: React.CSSProperties   = { color:'#94a3b8', fontSize:13 }
const row: React.CSSProperties   = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'rgba(15,23,42,0.6)', borderRadius:12 }

const renderLegend = (props: { payload?: Array<{ color?: string; value: string }> }) => (
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', fontSize:12, marginTop:8 }}>
    {(props.payload ?? []).map((e, i) => (
      <div key={i} style={{ display:'flex', alignItems:'center', gap:6, color:'#94a3b8' }}>
        <span style={{ width:10, height:10, borderRadius:2, background: e.color ?? '#6366f1', flexShrink:0 }} />
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.value}</span>
      </div>
    ))}
  </div>
)

interface Props {
  data: AnalysisResult
  t: Translations
  lang: Language
  providerName?: string
  autoInfo?: string
}

export default function Dashboard({ data, t, lang, providerName, autoInfo }: Props) {
  const { currency, summary, detectedAccounts, transactions, subscriptions, regularPayments,
          investments, transfers, categories, monthlyTotals, insights, totalSpend, period } = data

  const fmt = (n: number) =>
    new Intl.NumberFormat('cs-CZ', { style:'currency', currency: currency || 'CZK', maximumFractionDigits:0 }).format(Math.abs(n))

  // ── Category filter state ──
  const allCategoryNames = useMemo(() => categories.map(c => c.category), [categories])
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const clearFilter = () => setHiddenCategories(new Set())

  // Filtered data
  const filteredCategories = categories.filter(c => !hiddenCategories.has(c.category))
  const filteredTransactions = transactions.filter(tx => !hiddenCategories.has(tx.category))
  const filteredTop10 = [...filteredTransactions]
    .filter(tx => tx.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 10)

  // Recalculate monthly totals when filter active
  const filteredMonthlyTotals = useMemo(() => {
    if (hiddenCategories.size === 0) return monthlyTotals
    const byMonth: Record<string, number> = {}
    filteredTransactions.filter(tx => tx.amount < 0).forEach(tx => {
      const month = tx.date?.slice(0, 7)
      if (month) byMonth[month] = (byMonth[month] || 0) + Math.abs(tx.amount)
    })
    return Object.entries(byMonth).sort(([a],[b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }))
  }, [hiddenCategories, filteredTransactions, monthlyTotals])

  const hasFilter = hiddenCategories.size > 0
  const isMultiMonth = monthlyTotals.length > 1
  const subTotal = subscriptions.reduce((s, x) => s + x.amount, 0)

  // Stable color map
  const catColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    allCategoryNames.forEach((c, i) => { map[c] = COLORS[i % COLORS.length] })
    return map
  }, [allCategoryNames])

  const badge = (cat: string) => ({
    display:'inline-block' as const, padding:'2px 10px', borderRadius:9999, fontSize:12,
    background: hiddenCategories.has(cat) ? 'rgba(51,65,85,0.4)' : `${catColorMap[cat] ?? '#6366f1'}25`,
    color: hiddenCategories.has(cat) ? '#475569' : (catColorMap[cat] ?? '#a5b4fc'),
    whiteSpace:'nowrap' as const, cursor:'pointer',
    opacity: hiddenCategories.has(cat) ? 0.5 : 1,
    textDecoration: hiddenCategories.has(cat) ? 'line-through' : 'none' as const,
  })

  return (
    <div style={{ marginTop:40, display:'flex', flexDirection:'column', gap:24 }}>

      {/* ── Meta bar ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', color:'#64748b', fontSize:13, flexWrap:'wrap', gap:4 }}>
        <span>
          {t.detectedFiles(1)}
          {detectedAccounts.length > 0 && ` · ${t.detectedAccounts(detectedAccounts.length)}`}
        </span>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
          {providerName && <span>{t.statusProvider(providerName)}</span>}
          {autoInfo && (
            <span style={{ color:'#4338ca', fontSize:11 }}>
              ✨ {autoInfo}
            </span>
          )}
        </div>
      </div>

      {/* ── Summary ── */}
      {summary && (
        <div style={{ ...card, background:'rgba(49,46,129,0.25)', borderColor:'#4338ca' }}>
          <p style={{ ...h2, color:'#a5b4fc', marginBottom:8 }}>{t.monthlySummary}</p>
          <p style={{ color:'#cbd5e1', fontSize:15, lineHeight:1.6 }}>{summary}</p>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        <div style={card}>
          <p style={lbl}>{t.totalSpend}</p>
          <p style={{ color:'#fff', fontSize:26, fontWeight:700, marginTop:4 }}>{fmt(totalSpend)}</p>
          <p style={{ color:'#64748b', fontSize:12, marginTop:4 }}>{period}</p>
        </div>
        <div style={card}>
          <p style={lbl}>{t.transactions}</p>
          <p style={{ color:'#fff', fontSize:26, fontWeight:700, marginTop:4 }}>{transactions.length}</p>
          <p style={{ color:'#64748b', fontSize:12, marginTop:4 }}>
            {transactions.filter(tx=>tx.amount>0).length} {t.income} · {transactions.filter(tx=>tx.amount<0).length} {t.expenses}
          </p>
        </div>
        <div style={card}>
          <p style={lbl}>{t.subscriptions}</p>
          <p style={{ color:'#fff', fontSize:26, fontWeight:700, marginTop:4 }}>{subscriptions.length}</p>
          <p style={{ color:'#64748b', fontSize:12, marginTop:4 }}>~{fmt(subTotal)}{t.perMonth}</p>
        </div>
      </div>

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <div style={{ ...card, background:'rgba(49,46,129,0.2)', borderColor:'#4338ca' }}>
          <p style={{ ...h2, color:'#a5b4fc' }}>{t.insights}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 24px' }}>
            {insights.map((ins, i) => (
              <p key={i} style={{ color:'#cbd5e1', fontSize:14 }}>
                <span style={{ color:'#818cf8', marginRight:8 }}>→</span>{ins}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Category filter ── */}
      <div style={{ ...card, padding:'16px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ color:'#64748b', fontSize:13, flexShrink:0 }}>{t.filterCategories}:</span>
          {allCategoryNames.map(cat => (
            <span key={cat} onClick={() => toggleCategory(cat)} title={hiddenCategories.has(cat) ? 'Click to show' : 'Click to hide'} style={badge(cat)}>
              {translateCategory(cat, lang)}
            </span>
          ))}
          {hasFilter && (
            <button onClick={clearFilter} style={{ marginLeft:'auto', padding:'3px 12px', borderRadius:8, border:'1px solid #334155', background:'none', color:'#94a3b8', fontSize:12, cursor:'pointer' }}>
              ✕ {lang === 'cs' ? 'Zrušit filtr' : 'Clear filter'}
            </button>
          )}
        </div>
      </div>

      {/* ── Pie + Trend ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMultiMonth ? '1fr 1fr' : '1fr', gap:16 }}>
        <div style={card}>
          <p style={h2}>{t.spendingByCategory}</p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={filteredCategories.map(c => ({ ...c, name: translateCategory(c.category, lang) }))}
                dataKey="total" nameKey="name" cx="50%" cy="42%" outerRadius={95} label={false}
              >
                {filteredCategories.map(c => <Cell key={c.category} fill={catColorMap[c.category] ?? '#6366f1'} />)}
              </Pie>
              <Tooltip formatter={(v:number, name:string) => [fmt(v), name]}
                contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontSize:13 }} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {isMultiMonth && (
          <div style={card}>
            <p style={h2}>
              {t.monthlyTrend}
              {hasFilter && <span style={{ color:'#64748b', fontSize:12, fontWeight:400, marginLeft:8 }}>(filtered)</span>}
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={filteredMonthlyTotals} margin={{ top:8, right:16, left:0, bottom:48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill:'#94a3b8', fontSize:10 }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={45} />
                <Tooltip formatter={(v:number) => fmt(v)}
                  contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9' }} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ fill:'#6366f1', r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Top 10 ── */}
      {filteredTop10.length > 0 && (
        <div style={card}>
          <p style={h2}>
            {t.topExpenses(filteredTop10.length)}
            {hasFilter && <span style={{ color:'#64748b', fontSize:12, fontWeight:400, marginLeft:8 }}>(filtered)</span>}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filteredTop10.map((tx, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'28px 1fr auto auto', gap:'0 16px', alignItems:'center', padding:'8px 12px', background:'rgba(15,23,42,0.5)', borderRadius:10 }}>
                <span style={{ color:'#64748b', fontSize:13, fontWeight:600 }}>#{i+1}</span>
                <div>
                  <p style={{ color:'#fff', fontSize:14, fontWeight:500 }}>{tx.merchant}</p>
                  <p style={{ color:'#64748b', fontSize:12 }}>{tx.date}</p>
                </div>
                <span onClick={() => toggleCategory(tx.category)} style={badge(tx.category)}>
                  {translateCategory(tx.category, lang)}
                </span>
                <span style={{ color:'#f87171', fontWeight:600, fontSize:15, textAlign:'right', minWidth:90 }}>{fmt(tx.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Regular Payments + Subscriptions ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={card}>
          <p style={h2}>{t.regularPayments} <span style={{ color:'#64748b', fontSize:13, fontWeight:400 }}>{t.regularPaymentsSubtitle}</span></p>
          {regularPayments.length === 0
            ? <p style={{ color:'#64748b', fontSize:14 }}>{t.noStandingOrders}</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto', maxHeight:320 }}>
                {regularPayments.map((r, i) => (
                  <div key={i} style={row}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ color:'#fff', fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.merchant}</p>
                      <p style={{ color:'#94a3b8', fontSize:12 }}>{r.label} · {r.frequency}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                      <p style={{ color:'#fb923c', fontWeight:600 }}>{fmt(r.amount)}</p>
                      <p style={{ color:'#64748b', fontSize:12 }}>{t.total} {fmt(r.totalSpent)}</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        <div style={card}>
          <p style={h2}>{t.subscriptionsTitle} <span style={{ color:'#64748b', fontSize:13, fontWeight:400 }}>{t.subscriptionsSubtitle}</span></p>
          {subscriptions.length === 0
            ? <p style={{ color:'#64748b', fontSize:14 }}>{t.noSubscriptions}</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto', maxHeight:320 }}>
                {subscriptions.map((s, i) => (
                  <div key={i} style={row}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ color:'#fff', fontSize:14, fontWeight:500 }}>{s.merchant}</p>
                      <p style={{ color:'#94a3b8', fontSize:12 }}>{s.frequency} · {t.last} {s.lastSeen}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                      <p style={{ color:'#a5b4fc', fontWeight:600 }}>{fmt(s.amount)}</p>
                      <p style={{ color:'#64748b', fontSize:12 }}>{t.total} {fmt(s.totalSpent)}</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ── Investments ── */}
      {investments.length > 0 && (
        <div style={card}>
          <p style={h2}>{t.investmentsTitle}</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
            {investments.map((inv, i) => (
              <div key={i} style={row}>
                <div style={{ minWidth:0, flex:1 }}>
                  <p style={{ color:'#fff', fontSize:14, fontWeight:500 }}>{inv.merchant}</p>
                  <p style={{ color:'#94a3b8', fontSize:12 }}>{inv.label} · {t.last} {inv.lastSeen}</p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                  <p style={{ color:'#34d399', fontWeight:600 }}>{fmt(inv.amount)}</p>
                  <p style={{ color:'#64748b', fontSize:12 }}>{t.total} {fmt(inv.totalSpent)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Internal Transfers ── */}
      {transfers.length > 0 && (
        <div style={{ ...card, borderColor:'#1e40af' }}>
          <p style={{ ...h2, color:'#60a5fa' }}>{t.transfersTitle} <span style={{ color:'#64748b', fontSize:13, fontWeight:400 }}>{t.transfersSubtitle}</span></p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {transfers.map((tr, i) => (
              <div key={i} style={{ ...row, background:'rgba(30,58,138,0.2)' }}>
                <div>
                  <p style={{ color:'#93c5fd', fontSize:13 }}>{tr.date}</p>
                  <p style={{ color:'#64748b', fontSize:12 }}>{t.transferFrom}: {tr.fromAccount} → {t.transferTo}: {tr.toAccount}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ color:'#60a5fa', fontWeight:600 }}>{fmt(tr.amount)}</p>
                  <p style={{ color:'#64748b', fontSize:12 }}>{tr.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All transactions ── */}
      <div style={card}>
        <p style={h2}>
          {t.allTransactions(filteredTransactions.length)}
          {hasFilter && <span style={{ color:'#64748b', fontSize:12, fontWeight:400, marginLeft:8 }}>(filtered)</span>}
        </p>
        <div style={{ overflowY:'auto', maxHeight:360 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr style={{ color:'#64748b', borderBottom:'1px solid #334155', textAlign:'left' }}>
                {[t.date, t.merchant, t.category, t.amount].map(h => (
                  <th key={h} style={{ paddingBottom:10, paddingRight:16, fontWeight:500, position:'sticky', top:0, background:'#0f172a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx, i) => (
                <tr key={i} style={{ borderBottom:'1px solid rgba(51,65,85,0.4)' }}>
                  <td style={{ padding:'8px 16px 8px 0', color:'#94a3b8', whiteSpace:'nowrap' }}>{tx.date}</td>
                  <td style={{ padding:'8px 16px 8px 0', color: tx.amount > 0 ? '#34d399' : '#fff' }}>{tx.merchant}</td>
                  <td style={{ padding:'8px 16px 8px 0' }}>
                    <span onClick={() => toggleCategory(tx.category)} style={badge(tx.category)}>
                      {translateCategory(tx.category, lang)}
                    </span>
                  </td>
                  <td style={{ padding:'8px 0', color: tx.amount > 0 ? '#34d399' : '#f87171', textAlign:'right', fontWeight:500 }}>
                    {tx.amount > 0 ? '+' : ''}{fmt(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
