const { GoogleGenerativeAI } = require('@google/generative-ai')
const fs = require('fs'), path = require('path')

const key = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').match(/GEMINI_API_KEY=(.+)/)[1].trim()
const text = fs.readFileSync(path.join(__dirname, 'extracted-text.txt'), 'utf8')
const client = new GoogleGenerativeAI(key)

async function run() {
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
  })
  const prompt = `Parse this bank statement. Return ONLY raw JSON (no markdown) with: currency, transactions (array: date/amount/merchant/category), totalSpend.\n\nTEXT:\n${text.slice(0, 5000)}`
  console.log('Sending to gemini-2.5-flash...')
  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  console.log('Raw response (first 500 chars):')
  console.log(raw.slice(0, 500))
  console.log('\nLast 200 chars:')
  console.log(raw.slice(-200))
}
run().catch(e => console.log('Error:', e.message))
