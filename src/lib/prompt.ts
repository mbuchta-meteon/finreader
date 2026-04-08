import type { Language } from './types'
import { prepareText } from './text-prepare'

// Shared JSON schema instruction used by both text and vision prompts
function buildSchemaInstruction(lang: string): string {
  return `You are an expert financial data parser. Parse bank statement data and return ONLY raw JSON — no markdown, no backticks.

Statement language: any (CZ/SK/DE/EN). Output language for summary/insights: ${lang}.
Multiple accounts may be separated by "--- ACCOUNT BREAK ---".

Return this exact JSON structure:
{
  "currency": "CZK",
  "period": "Jan 2026 – Mar 2026",
  "accountOwner": "Jan Novák",
  "detectedAccounts": ["1016687745/5500 CZK"],
  "summary": "2-3 sentences in ${lang}",
  "transactions": [
    { "date": "YYYY-MM-DD", "amount": -542.16, "merchant": "Netflix", "category": "Subscriptions" }
  ],
  "subscriptions": [
    { "merchant": "Netflix", "amount": 239.00, "frequency": "monthly", "lastSeen": "YYYY-MM-DD", "totalSpent": 478.00 }
  ],
  "regularPayments": [
    { "merchant": "Hypo splatka", "amount": 28130.00, "label": "Mortgage", "frequency": "monthly", "lastSeen": "YYYY-MM-DD", "totalSpent": 28130.00 }
  ],
  "investments": [
    { "merchant": "Penzijko", "amount": 300.00, "label": "Pension", "lastSeen": "YYYY-MM-DD", "totalSpent": 600.00 }
  ],
  "transfers": [
    { "date": "YYYY-MM-DD", "amount": 10000.00, "fromAccount": "1016687745/5500", "toAccount": "2000720082/2010", "note": "Internal transfer" }
  ],
  "categories": [
    { "category": "Groceries", "total": 15420.50, "count": 12 }
  ],
  "monthlyTotals": [
    { "month": "2026-03", "total": 45230.00 }
  ],
  "insights": ["insight 1 in ${lang}", "insight 2 in ${lang}"],
  "totalSpend": 132893.95
}

RULES:
- accountOwner: full name of the account holder exactly as printed on the statement. Empty string if not found.
- transactions: ALL transactions. negative=expense, positive=income. Use readable merchant names, never raw account numbers.
- subscriptions: digital recurring services only (streaming, SaaS, AI tools). Absolute amounts.
- regularPayments: standing orders — mortgage, rent, utilities, insurance, pension. Absolute amounts.
- investments: savings transfers, pension, investment platforms, crypto. Absolute amounts.
- transfers: internal between user's own accounts (same amount in+out within 2 days). Exclude from totalSpend.
- categories (use ONLY these): Groceries, Restaurants & Bars, Fuel, Transport, Entertainment, Shopping, Housing, Utilities, Insurance, Savings & Pension, Childcare, Health, Subscriptions, ATM & Cash, Investments & Transfers, Other
- monthlyTotals: expenses only (positive numbers), one entry per calendar month.
- totalSpend: expenses only (positive number), exclude income and internal transfers.
- insights: 4-6 actionable insights with actual amounts and currency code, in ${lang}.
If unparseable: { "error": "Could not parse transactions from this document" }`
}

// Text-based prompt (CSV / TXT) — raw text appended
export function buildPrompt(rawText: string, language: Language): string {
  const lang = language === 'cs' ? 'Czech' : 'English'
  const text = prepareText(rawText)
  return `${buildSchemaInstruction(lang)}\n\nRAW TEXT:\n${text}`
}

// Vision prompt — no raw text, image(s)/PDF attached separately by the provider
export function buildVisionPrompt(language: Language): string {
  const lang = language === 'cs' ? 'Czech' : 'English'
  return `${buildSchemaInstruction(lang)}\n\nThe bank statement is provided as the attached image(s)/PDF. Read all pages carefully and extract every transaction visible.`
}
