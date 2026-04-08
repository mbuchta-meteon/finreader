import Anthropic from '@anthropic-ai/sdk'
import type { ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages'
import type { AIProvider, FileData } from '../ai-provider'
import type { AnalysisResult, Language } from '../types'
import { buildPrompt, buildVisionPrompt } from '../prompt'
import { parseJSON } from '../ai-provider'
import { toImageBlocks } from './vision-utils'

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude' as const
  readonly displayName = 'Claude Sonnet 4'
  readonly costPer1kAnalyses = 86
  readonly supportsVision = true

  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async analyze(text: string, language: Language): Promise<AnalysisResult> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8096,
      messages: [{ role: 'user', content: buildPrompt(text, language) }],
    })
    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    return parseJSON(raw)
  }

  async analyzeFile(file: FileData, language: Language): Promise<AnalysisResult> {
    if (file.mimeType === 'application/pdf') {
      const { extractPdfText } = await import('./vision-utils')
      const text = await extractPdfText(file.buffer)
      return this.analyze(text, language)
    }

    const imageBlocks = await toImageBlocks(file)
    const content: Array<ImageBlockParam | TextBlockParam> = [
      ...imageBlocks.map(b => ({
        type: 'image' as const,
        source: b.source,
      })),
      { type: 'text' as const, text: buildVisionPrompt(language) },
    ]

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8096,
      messages: [{ role: 'user', content }],
    })
    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    return parseJSON(raw)
  }
}
