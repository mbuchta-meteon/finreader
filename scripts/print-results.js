const fs = require('fs'), path = require('path')
const dir = 'D:/ai/finance-app/scripts'
const results = fs.readdirSync(dir).filter(f => f.startsWith('result-'))
for (const f of results) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  console.log(`\n=== ${f} ===`)
  console.log(`currency: ${d.currency} | period: ${d.period} | transactions: ${d.transactions?.length} | totalSpend: ${d.totalSpend?.toLocaleString()}`)
  console.log(`categories: ${d.categories?.map(c=>c.category).join(', ')}`)
  console.log(`regularPayments: ${d.regularPayments?.map(r=>r.merchant).join(', ') || 'none'}`)
  console.log(`subscriptions: ${d.subscriptions?.map(s=>s.merchant).join(', ') || 'none'}`)
  console.log(`investments: ${d.investments?.map(i=>`${i.merchant}(${i.label})`).join(', ') || 'none'}`)
  console.log(`transfers: ${d.transfers?.length || 0}`)
  console.log(`monthlyTotals: ${d.monthlyTotals?.map(m=>`${m.month}:${m.total?.toLocaleString()}`).join(', ')}`)
  console.log(`summary: ${d.summary?.slice(0,200)}`)
}
