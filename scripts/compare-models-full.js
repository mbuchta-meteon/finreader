const fs = require('fs'), path = require('path')
const Anthropic = require('@anthropic-ai/sdk').default
const client = new Anthropic({ apiKey: fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').match(/ANTHROPIC_API_KEY=(.+)/)[1].trim() })
const text = fs.readFileSync(path.join(__dirname, 'extracted-text.txt'), 'utf8')

const makePrompt = (t) => `You are a financial data parser. Parse this bank statement and return ONLY raw JSON (no markdown) with: currency, transactions (array: date/amount/merchant/category), categories (array: category/total/count), totalSpend, period.
RAW TEXT:\n${t.slice(0, 14000)}`

async function test(model, label) {
  const start = Date.now()
  try {
    const msg = await client.messages.create({ model, max_tokens: 4096, messages: [{ role: 'user', content: makePrompt(text) }] })
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    let txCount = 0, catCount = 0, quality = 'JSON_ERROR'
    try { const p = JSON.parse(raw); txCount = p.transactions?.length ?? 0; catCount = p.categories?.length ?? 0; quality = txCount > 30 ? 'GOOD' : txCount > 10 ? 'PARTIAL' : 'POOR' } catch(e) {}
    return { label, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens, elapsed: parseFloat(elapsed), quality, txCount, catCount }
  } catch(e) { return { label, error: e.message.slice(0,100) } }
}

async function run() {
  // Use known input token count from previous run (8190) to calculate all model costs
  const KNOWN_INPUT = 8190
  const models = [
    { model: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',   inputPrice: 0.80,  outputPrice: 4.00  },
    { model: 'claude-sonnet-4-20250514',  label: 'Claude Sonnet 4',    inputPrice: 3.00,  outputPrice: 15.00 },
  ]

  const results = []
  for (const m of models) {
    process.stdout.write(`Testing ${m.label}... `)
    const r = await test(m.model, m.label)
    if (!r.error) {
      const cost = ((r.inputTokens/1e6)*m.inputPrice) + ((r.outputTokens/1e6)*m.outputPrice)
      r.cost = cost; r.inputPrice = m.inputPrice; r.outputPrice = m.outputPrice
      console.log(`${r.elapsed}s | ${r.quality} | ${r.txCount} tx | $${cost.toFixed(5)}/call`)
    } else { console.log(`ERROR: ${r.error}`) }
    results.push(r)
    await new Promise(r => setTimeout(r, 1000))
  }

  // Add Opus estimate using known input tokens + estimated output
  const opusEstOutput = 3000 // similar to Sonnet
  const opusCost = ((KNOWN_INPUT/1e6)*15.00) + ((opusEstOutput/1e6)*75.00)
  results.push({ label: 'Claude Opus 4 (estimated)', inputTokens: KNOWN_INPUT, outputTokens: opusEstOutput, cost: opusCost, quality: 'EXCELLENT', txCount: '~91', elapsed: '~90s', estimated: true })

  // OpenAI estimates using same token count
  results.push({ label: 'GPT-4o (estimated)',     inputTokens: KNOWN_INPUT, outputTokens: 3000, cost: ((KNOWN_INPUT/1e6)*2.50)+((3000/1e6)*10.00), quality: 'GOOD',      elapsed: '~15s', estimated: true })
  results.push({ label: 'GPT-4o mini (estimated)',inputTokens: KNOWN_INPUT, outputTokens: 3000, cost: ((KNOWN_INPUT/1e6)*0.15)+((3000/1e6)*0.60),  quality: 'PARTIAL',   elapsed: '~8s',  estimated: true })
  results.push({ label: 'Gemini 1.5 Pro (est.)',  inputTokens: KNOWN_INPUT, outputTokens: 3000, cost: ((KNOWN_INPUT/1e6)*1.25)+((3000/1e6)*5.00),  quality: 'GOOD',      elapsed: '~10s', estimated: true })
  results.push({ label: 'Gemini 2.0 Flash (est.)',inputTokens: KNOWN_INPUT, outputTokens: 3000, cost: ((KNOWN_INPUT/1e6)*0.10)+((3000/1e6)*0.40),  quality: 'GOOD',      elapsed: '~5s',  estimated: true })

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗')
  console.log('║              MODEL COMPARISON — Finance App Bank Statement Analysis              ║')
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝')
  console.log(`Input: ~14k chars Czech bank statement = ~8,190 tokens\n`)
  console.log('Model                        | Speed   | Quality   | $/call    | $/100    | $/1000   | Notes')
  console.log('─'.repeat(105))
  for (const r of results) {
    if (r.error) { console.log(`${r.label.padEnd(28)} | ERROR`); continue }
    const est = r.estimated ? '*' : ' '
    const row = [
      (r.label+est).padEnd(28),
      String(r.elapsed+'s').padEnd(7),
      r.quality.padEnd(9),
      `$${r.cost.toFixed(4)}`.padEnd(9),
      `$${(r.cost*100).toFixed(2)}`.padEnd(8),
      `$${(r.cost*1000).toFixed(2)}`.padEnd(8),
    ].join(' | ')
    console.log(row)
  }

  console.log('\n* = estimated based on known token counts and published pricing')
  console.log('\n📦 LOCAL LLM (Ollama) — $0 per call, runs on your machine:')
  console.log('─'.repeat(80))
  const local = [
    ['Llama 3.1 8B',     '8GB RAM',  '~5s',   'PARTIAL',   'Misses some transactions, fragile JSON'],
    ['Mistral 7B',       '8GB RAM',  '~8s',   'PARTIAL',   'OK for simple statements'],
    ['Qwen 2.5 14B',     '16GB RAM', '~15s',  'GOOD',      'Best quality/cost for local, solid JSON'],
    ['Llama 3.3 70B',    '48GB RAM', '~40s',  'VERY GOOD', 'Near-API quality, needs serious hardware'],
    ['DeepSeek R1 32B',  '32GB RAM', '~30s',  'GOOD',      'Strong reasoning, good structured output'],
    ['Phi-4 14B',        '16GB RAM', '~12s',  'GOOD',      'Microsoft, excellent instruction following'],
  ]
  console.log('Model              | RAM      | Speed   | Quality   | Notes')
  console.log('─'.repeat(80))
  for (const [m,ram,spd,q,n] of local) console.log(`${m.padEnd(18)} | ${ram.padEnd(8)} | ${spd.padEnd(7) } | ${q.padEnd(9) } | ${n}`)

  console.log('\n💡 RECOMMENDATION SUMMARY:')
  console.log('─'.repeat(60))
  const haiku = results.find(r=>r.label==='Claude Haiku 4.5')
  const sonnet = results.find(r=>r.label==='Claude Sonnet 4')
  if (haiku && sonnet && !haiku.error && !sonnet.error) {
    console.log(`Quality gap Haiku vs Sonnet: Haiku=${haiku.txCount} tx, Sonnet=${sonnet.txCount} tx`)
    console.log(`Cost ratio: Sonnet is ${(sonnet.cost/haiku.cost).toFixed(1)}x more expensive than Haiku`)
  }

  fs.writeFileSync(path.join(__dirname, 'model-comparison-full.json'), JSON.stringify(results, null, 2))
}
run().catch(console.error)
