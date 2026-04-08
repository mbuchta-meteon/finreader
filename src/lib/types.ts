export interface Transaction {
  date: string
  amount: number
  merchant: string
  category: string
}

export interface Subscription {
  merchant: string
  amount: number
  frequency: 'monthly' | 'weekly' | 'annual'
  lastSeen: string
  totalSpent: number
}

export interface RegularPayment {
  merchant: string
  amount: number
  label: string
  frequency: 'monthly' | 'weekly' | 'annual'
  lastSeen: string
  totalSpent: number
}

export interface Investment {
  merchant: string
  amount: number
  label: string
  lastSeen: string
  totalSpent: number
}

export interface Transfer {
  date: string
  amount: number
  fromAccount: string
  toAccount: string
  note: string
}

export interface CategoryBreakdown {
  category: string
  total: number
  count: number
}

export interface MonthlyTotal {
  month: string
  total: number
}

export interface AnalysisResult {
  currency: string
  summary: string
  accountOwner: string        // full name of the account holder as printed on the statement
  detectedAccounts: string[]
  transactions: Transaction[]
  subscriptions: Subscription[]
  regularPayments: RegularPayment[]
  investments: Investment[]
  transfers: Transfer[]
  categories: CategoryBreakdown[]
  monthlyTotals: MonthlyTotal[]
  insights: string[]
  totalSpend: number
  period: string
}

export type Language = 'en' | 'cs'
export type ProviderName = 'claude' | 'haiku' | 'gemini'

// Category name translations
export const CATEGORY_TRANSLATIONS: Record<string, { en: string; cs: string }> = {
  'Groceries':               { en: 'Groceries',               cs: 'Potraviny' },
  'Restaurants & Bars':      { en: 'Restaurants & Bars',      cs: 'Restaurace a bary' },
  'Fuel':                    { en: 'Fuel',                    cs: 'Pohonné hmoty' },
  'Transport':               { en: 'Transport',               cs: 'Doprava' },
  'Entertainment':           { en: 'Entertainment',           cs: 'Zábava' },
  'Shopping':                { en: 'Shopping',                cs: 'Nákupy' },
  'Housing':                 { en: 'Housing',                 cs: 'Bydlení' },
  'Utilities':               { en: 'Utilities',               cs: 'Energie a služby' },
  'Insurance':               { en: 'Insurance',               cs: 'Pojištění' },
  'Savings & Pension':       { en: 'Savings & Pension',       cs: 'Úspory a penze' },
  'Childcare':               { en: 'Childcare',               cs: 'Péče o děti' },
  'Health':                  { en: 'Health',                  cs: 'Zdraví' },
  'Subscriptions':           { en: 'Subscriptions',           cs: 'Předplatné' },
  'ATM & Cash':              { en: 'ATM & Cash',              cs: 'Hotovost a bankomat' },
  'Investments & Transfers': { en: 'Investments & Transfers', cs: 'Investice a převody' },
  'Other':                   { en: 'Other',                   cs: 'Ostatní' },
}

export function translateCategory(category: string, lang: Language): string {
  return CATEGORY_TRANSLATIONS[category]?.[lang] ?? category
}
