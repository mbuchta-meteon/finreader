import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, FileData } from '../ai-provider'
import type { AnalysisResult, Language } from '../types'
import { buildPrompt, buildVisionPrompt } from '../prompt'
import { parseJSON } from '../ai-provider'

const RETRY_DELAYS = [3000, 8000, 15000]

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const
  readonly displayName = 'Gemini 2.5 Flash'
  readonly costPer1kAnalyses = 3
  readonly supportsVision = true   // native PDF + image support

  private client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

  private getModel() {
    return this.client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
    })
  }

  async analyze(text: string, language: Language): Promise<AnalysisResult> {
    return this._callWithRetry(() =>
      this.getModel().generateContent(buildPrompt(text, language))
    )
  }

  async analyzeFile(file: FileData, language: Language): Promise<AnalysisResult> {
    // Gemini accepts raw PDF bytes and images natively via inlineData
    const prompt = buildVisionPrompt(language)

    return this._callWithRetry(() =>
      this.getModel().generateContent([
        {
          inlineData: {
            mimeType: file.mimeType,
            data: file.buffer.toString('base64'),
          },
        },
        prompt,
      ])
    )
  }

  private async _callWithRetry(
    fn: () => Promise<{ response: { text: () => string } }>
  ): Promise<AnalysisResult> {
    let lastError: Error = new Error('Unknown error')

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const result = await fn()
        const raw = result.response.text()
        const cleaned = raw.trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/i, '')
          .trim()
        return parseJSON(cleaned)
      } catch (err) {
        lastError = err as Error
        const msg = lastError.message
        const isRetryable =
          msg.includes('503') || msg.includes('429') ||
          msg.includes('UNAVAILABLE') || msg.includes('overloaded') ||
          msg.includes('high demand')

        if (!isRetryable || attempt === RETRY_DELAYS.length) break

        const delay = RETRY_DELAYS[attempt]
        console.log(`Gemini attempt ${attempt + 1} failed (${msg.slice(0, 80)}). Retrying in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    throw lastError
  }
}
