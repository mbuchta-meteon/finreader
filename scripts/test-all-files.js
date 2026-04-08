const fs = require('fs'), path = require('path'), http = require('http')
const FormData = require('form-data')

const BASE = 'D:/ai/finance-app/example_bank_statement'
const files = fs.readdirSync(BASE).map(f => ({ name: f, full: path.join(BASE, f) }))

function post(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => resolve({ status: res.statusCode, body: d }))
    })
    req.on('error', reject)
    if (body && body.pipe) body.pipe(req)
    else { if (body) req.write(body); req.end() }
  })
}

async function testFile(file) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`FILE: ${file.name}`)
  console.log('='.repeat(60))

  // Parse
  const form = new FormData()
  form.append('file', fs.createReadStream(file.full), { filename: file.name })
  let parseResult
  try {
    const r = await post({ hostname:'127.0.0.1', port:3000, path:'/api/parse', method:'POST', headers: form.getHeaders() }, form)
    parseResult = JSON.parse(r.body)
    if (parseResult.error) { console.log(`PARSE ERROR: ${parseResult.error}`); return }
    console.log(`✓ PARSE OK — raw text: ${parseResult.text?.length} chars`)
  } catch(e) { console.log(`PARSE EXCEPTION: ${e.message}`); return }

  // Analyze with claude (gemini quota exhausted)
  const body = JSON.stringify({ text: parseResult.text, provider: 'claude', language: 'en' })
  console.log(`  Sending to Claude...`)
  try {
    const r = await post({
      hostname:'127.0.0.1', port:3000, path:'/api/analyze', method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}
    }, body)
    const result = JSON.parse(r.body)
    if (result.error) {
      console.log(`✗ ANALYZE ERROR: ${result.error}`)
      if (result.raw) console.log(`  RAW (first 300): ${result.raw.slice(0,300)}`)
      return
    }
    console.log(`✓ currency: ${result.currency}`)
    console.log(`✓ period: ${result.period}`)
    console.log(`✓ transactions: ${result.transactions?.length}`)
    console.log(`✓ totalSpend: ${result.totalSpend?.toLocaleString()}`)
    console.log(`✓ categories (${result.categories?.length}): ${result.categories?.map(c=>c.category).join(', ')}`)
    console.log(`✓ regularPayments (${result.regularPayments?.length}): ${result.regularPayments?.map(r=>r.merchant).join(', ') || 'none'}`)
    console.log(`✓ subscriptions (${result.subscriptions?.length}): ${result.subscriptions?.map(s=>s.merchant).join(', ') || 'none'}`)
    console.log(`✓ investments (${result.investments?.length}): ${result.investments?.map(i=>i.merchant).join(', ') || 'none'}`)
    console.log(`✓ transfers: ${result.transfers?.length || 0}`)
    console.log(`✓ monthlyTotals: ${result.monthlyTotals?.map(m=>`${m.month}:${m.total?.toLocaleString()}`).join(', ')}`)
    console.log(`✓ summary: ${result.summary?.slice(0,120)}...`)
    console.log(`✓ provider: ${result._meta?.displayName}`)
    fs.writeFileSync(path.join('D:/ai/finance-app/scripts', `result-${file.name.replace(/\./g,'-')}.json`), JSON.stringify(result,null,2))
  } catch(e) { console.log(`ANALYZE EXCEPTION: ${e.message}`) }
}

async function run() {
  for (const f of files) {
    await testFile(f)
    await new Promise(r => setTimeout(r, 3000))
  }
  console.log('\n\nALL DONE')
}
run().catch(console.error)
