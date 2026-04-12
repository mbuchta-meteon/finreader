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

export type Language = 'en' | 'cs' | 'de' | 'fr' | 'it' | 'pt' | 'pl' | 'hu'
export type ProviderName = 'claude' | 'haiku' | 'gemini'

// Category name translations
export const CATEGORY_TRANSLATIONS: Record<string, Partial<Record<Language, string>>> = {
  'Groceries':               { en: 'Groceries',               cs: 'Potraviny',            de: 'Lebensmittel',        fr: 'Alimentation',          it: 'Spesa',                  pt: 'Supermercado',         pl: 'Zakupy spożywcze',    hu: 'Élelmiszer' },
  'Restaurants & Bars':      { en: 'Restaurants & Bars',      cs: 'Restaurace a bary',    de: 'Restaurants & Bars',  fr: 'Restaurants & Bars',    it: 'Ristoranti & Bar',       pt: 'Restaurantes & Bares', pl: 'Restauracje i bary',  hu: 'Éttermek & Bárok' },
  'Fuel':                    { en: 'Fuel',                    cs: 'Pohonné hmoty',        de: 'Kraftstoff',          fr: 'Carburant',             it: 'Carburante',             pt: 'Combustível',          pl: 'Paliwo',              hu: 'Üzemanyag' },
  'Transport':               { en: 'Transport',               cs: 'Doprava',              de: 'Transport',           fr: 'Transport',             it: 'Trasporti',              pt: 'Transporte',           pl: 'Transport',           hu: 'Közlekedés' },
  'Entertainment':           { en: 'Entertainment',           cs: 'Zábava',               de: 'Unterhaltung',        fr: 'Loisirs',               it: 'Intrattenimento',        pt: 'Entretenimento',       pl: 'Rozrywka',            hu: 'Szórakozás' },
  'Shopping':                { en: 'Shopping',                cs: 'Nákupy',               de: 'Einkäufe',            fr: 'Shopping',              it: 'Shopping',               pt: 'Compras',              pl: 'Zakupy',              hu: 'Vásárlás' },
  'Housing':                 { en: 'Housing',                 cs: 'Bydlení',              de: 'Wohnen',              fr: 'Logement',              it: 'Abitazione',             pt: 'Habitação',            pl: 'Mieszkanie',          hu: 'Lakhatás' },
  'Utilities':               { en: 'Utilities',               cs: 'Energie a služby',     de: 'Energie & Dienste',   fr: 'Énergie & Services',    it: 'Utenze',                 pt: 'Serviços públicos',    pl: 'Media i usługi',      hu: 'Közüzemi szolgáltatások' },
  'Insurance':               { en: 'Insurance',               cs: 'Pojištění',            de: 'Versicherung',        fr: 'Assurance',             it: 'Assicurazione',          pt: 'Seguros',              pl: 'Ubezpieczenia',       hu: 'Biztosítás' },
  'Savings & Pension':       { en: 'Savings & Pension',       cs: 'Úspory a penze',       de: 'Sparen & Rente',      fr: 'Épargne & Retraite',    it: 'Risparmi & Pensione',    pt: 'Poupança & Pensão',    pl: 'Oszczędności i emerytura', hu: 'Megtakarítás & Nyugdíj' },
  'Childcare':               { en: 'Childcare',               cs: 'Péče o děti',          de: 'Kinderbetreuung',     fr: 'Garde d\'enfants',      it: 'Cura dei bambini',       pt: 'Cuidados infantis',    pl: 'Opieka nad dziećmi',  hu: 'Gyermekgondozás' },
  'Health':                  { en: 'Health',                  cs: 'Zdraví',               de: 'Gesundheit',          fr: 'Santé',                 it: 'Salute',                 pt: 'Saúde',                pl: 'Zdrowie',             hu: 'Egészség' },
  'Subscriptions':           { en: 'Subscriptions',           cs: 'Předplatné',           de: 'Abonnements',         fr: 'Abonnements',           it: 'Abbonamenti',            pt: 'Assinaturas',          pl: 'Subskrypcje',         hu: 'Előfizetések' },
  'ATM & Cash':              { en: 'ATM & Cash',              cs: 'Hotovost a bankomat',  de: 'Bargeld & ATM',       fr: 'Espèces & DAB',         it: 'Bancomat & Contanti',    pt: 'Caixa & ATM',          pl: 'Bankomat i gotówka',  hu: 'ATM & Készpénz' },
  'Investments & Transfers': { en: 'Investments & Transfers', cs: 'Investice a převody',  de: 'Investitionen',       fr: 'Investissements',       it: 'Investimenti',           pt: 'Investimentos',        pl: 'Inwestycje',          hu: 'Befektetések' },
  'Other':                   { en: 'Other',                   cs: 'Ostatní',              de: 'Sonstiges',           fr: 'Autres',                it: 'Altro',                  pt: 'Outros',               pl: 'Inne',                hu: 'Egyéb' },
}

export function translateCategory(category: string, lang: Language): string {
  return CATEGORY_TRANSLATIONS[category]?.[lang] ?? category
}
