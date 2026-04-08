const fs = require('fs'), path = require('path'), http = require('http')
const text = fs.readFileSync(path.join(__dirname, 'extracted-text.txt'), 'utf8')
const body = JSON.stringify({ text })
const req = http.request({ hostname:'127.0.0.1', port:3000, path:'/api/analyze', method:'POST',
  headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}}, res => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    const p = JSON.parse(d)
    if (p.error) { console.log('ERROR:', p.error); return }
    console.log('✓ currency:', p.currency)
    console.log('✓ summary:', p.summary?.slice(0, 120) + '...')
    console.log('✓ transactions:', p.transactions?.length)
    console.log('✓ subscriptions:', p.subscriptions?.map(s=>s.merchant).join(', '))
    console.log('✓ regularPayments:', p.regularPayments?.map(r=>r.label+':'+r.merchant).join(', '))
    console.log('✓ investments:', p.investments?.map(i=>i.label+':'+i.merchant).join(', '))
    console.log('✓ categories:', p.categories?.map(c=>c.category).join(', '))
    console.log('✓ monthlyTotals:', JSON.stringify(p.monthlyTotals))
    console.log('✓ totalSpend:', p.totalSpend)
    fs.writeFileSync(path.join(__dirname, 'analyze-result.json'), JSON.stringify(p, null, 2))
    console.log('\nFull result saved to scripts/analyze-result.json')
  })
})
req.on('error', e => console.log('err:', e.message))
req.write(body); req.end()
