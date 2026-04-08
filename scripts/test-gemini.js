const fs = require('fs'), path = require('path'), http = require('http')
const text = fs.readFileSync(path.join(__dirname, 'extracted-text.txt'), 'utf8')
const body = JSON.stringify({ text, provider: 'gemini', language: 'en' })
const req = http.request({ hostname:'127.0.0.1', port:3000, path:'/api/analyze', method:'POST',
  headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}}, res => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    const p = JSON.parse(d)
    if (p.error) { console.log('ERROR:', p.error); return }
    console.log('✓ provider:', p._meta?.displayName)
    console.log('✓ currency:', p.currency)
    console.log('✓ transactions:', p.transactions?.length)
    console.log('✓ regularPayments:', p.regularPayments?.map(r => r.label).join(', '))
    console.log('✓ subscriptions:', p.subscriptions?.map(s => s.merchant).join(', '))
    console.log('✓ transfers:', p.transfers?.length)
    console.log('✓ totalSpend:', p.totalSpend)
    console.log('SUCCESS')
  })
})
req.on('error', e => console.log('err:', e.message))
req.write(body); req.end()
