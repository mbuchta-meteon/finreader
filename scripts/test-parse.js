const fs = require('fs')
const path = require('path')
const http = require('http')
const FormData = require('form-data')

const filePath = path.join(__dirname, '..', 'example_bank_statement', 'Pohyby_1016687745_202603311811.pdf')
const form = new FormData()
form.append('file', fs.createReadStream(filePath), { filename: 'statement.pdf', contentType: 'application/pdf' })

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/parse',
  method: 'POST',
  headers: form.getHeaders(),
}

console.log('Sending PDF to /api/parse...')
const req = http.request(options, res => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    console.log('Status:', res.statusCode)
    try {
      const parsed = JSON.parse(data)
      if (parsed.error) {
        console.log('Error:', parsed.error)
      } else {
        console.log('Extracted text (first 1000 chars):')
        console.log(parsed.text?.slice(0, 1000))
        console.log('\nText length:', parsed.text?.length)
        // Save full text for inspection
        fs.writeFileSync(path.join(__dirname, 'extracted-text.txt'), parsed.text || '')
        console.log('\nFull text saved to scripts/extracted-text.txt')
      }
    } catch(e) {
      console.log('Raw response:', data.slice(0, 500))
    }
  })
})
req.on('error', e => console.log('Request error:', e.message))
form.pipe(req)
