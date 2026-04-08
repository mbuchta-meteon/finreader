const fs = require('fs'), path = require('path')
const Anthropic = require('@anthropic-ai/sdk').default

const client = new Anthropic({ apiKey: require('fs').readFileSync(path.join(__dirname, '../.env.local'), 'utf8').match(/ANTHROPIC_API_KEY=(.+)/)[1].trim() })

const text = fs.readFileSync(path.join(__dirname, 'extracted-text.txt'), 'utf8')
console.log('Input text length:', text.length, 'chars')

async function testModel(model, label) {
  const start = Date.now()
  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 8096,
      messages: [{ role: 'user', content: `Parse this bank statement and return JSON with transactions, categories, insights. Text: ${text.slice(0, 14000)}` }],
    })
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const input = msg.usage.input_tokens
    const output = msg.usage.output_tokens
    console.log(`\n[${label}]`)
    console.log(`  Time: ${elapsed}s`)
    console.log(`  Input tokens: ${input}`)
    console.log(`  Output tokens: ${output}`)
    console.log(`  Total tokens: ${input + output}`)
    console.log(`  Response preview: ${msg.content[0].text.slice(0, 80)}...`)
    return { label, input, output, elapsed }
  } catch(e) {
    console.log(`\n[${label}] ERROR: ${e.message}`)
    return { label, error: e.message }
  }
}

async function run() {
  const results = []

  // Test available Claude models
  results.push(await testModel('claude-haiku-4-5-20251001', 'Claude Haiku 4.5'))
  results.push(await testModel('claude-sonnet-4-20250514', 'Claude Sonnet 4 (current)'))

  // Cost calculation per model (prices per 1M tokens as of early 2026)
  const pricing = {
    'Claude Haiku 4.5':        { input: 0.80,  output: 4.00  },
    'Claude Sonnet 4 (current)': { input: 3.00,  output: 15.00 },
  }

  console.log('\n\n=== COST COMPARISON ===')
  console.log('(Based on actual token usage from this statement)\n')

  for (const r of results) {
    if (r.error) continue
    const p = pricing[r.label]
    if (!p) continue
    const costPer = ((r.input / 1_000_000) * p.input + (r.output / 1_000_000) * p.output)
    const costPer100 = costPer * 100
    const costPer1000 = costPer * 1000
    console.log(`${r.label}:`)
    console.log(`  Cost per analysis: $${costPer.toFixed(5)}`)
    console.log(`  Cost per 100 analyses: $${costPer100.toFixed(3)}`)
    console.log(`  Cost per 1,000 analyses: $${costPer1000.toFixed(2)}`)
    console.log(`  Speed: ${r.elapsed}s`)
    console.log()
  }

  fs.writeFileSync(path.join(__dirname, 'model-comparison.json'), JSON.stringify(results, null, 2))
  console.log('Full results saved to scripts/model-comparison.json')
}

run().catch(console.error)
