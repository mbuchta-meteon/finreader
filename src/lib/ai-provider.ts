import type { AnalysisResult, Language, ProviderName } from './types'

// Raw file data passed to vision-capable providers
export interface FileData {
  buffer: Buffer
  mimeType: string   // 'application/pdf' | 'image/png' | 'image/jpeg' etc.
  name: string
}

export interface AIProvider {
  readonly name: ProviderName
  readonly displayName: string
  readonly costPer1kAnalyses: number
  readonly supportsVision: boolean

  // Text-based analysis — used for CSV / TXT files
  analyze(text: string, language: Language): Promise<AnalysisResult>

  // Vision-based analysis — used for PDF and images directly
  // Only called when supportsVision === true
  analyzeFile(file: FileData, language: Language): Promise<AnalysisResult>
}

export function parseJSON(raw: string): AnalysisResult {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const parsed = JSON.parse(cleaned) as AnalysisResult & { error?: string }
  if (parsed.error) throw new Error(parsed.error)

  parsed.regularPayments  ??= []
  parsed.investments      ??= []
  parsed.monthlyTotals    ??= []
  parsed.subscriptions    ??= []
  parsed.transfers        ??= []
  parsed.detectedAccounts ??= []
  parsed.accountOwner     ??= ''
  parsed.currency         ??= 'CZK'
  parsed.summary          ??= ''

  // Sort monthlyTotals chronologically
  parsed.monthlyTotals.sort((a, b) => a.month.localeCompare(b.month))

  return parsed
}

export function getProvider(name?: ProviderName): AIProvider {
  const choice = (name ?? process.env.AI_PROVIDER ?? 'haiku') as ProviderName
  switch (choice) {
    case 'claude':  return new (require('./providers/claude').ClaudeProvider)()
    case 'gemini':  return new (require('./providers/gemini').GeminiProvider)()
    case 'haiku':
    default:        return new (require('./providers/haiku').HaikuProvider)()
  }
}
