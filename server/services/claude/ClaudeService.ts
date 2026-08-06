import https from 'node:https'
import type {
  ClaudeMessage,
  ClaudeRequest,
  ClaudeResponse,
  ClaudeServiceConfig,
} from './claude.types'

const CLAUDE_API_BASE_URL = 'https://api.anthropic.com/v1'
const CLAUDE_API_VERSION = '2023-06-01'

// HTTPS agent with increased TCP keep-alive settings
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000, // 30 seconds - increased from default 1000ms
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000, // 60 seconds
})

export default class ClaudeService {
  private apiKey: string
  private defaultModel: string
  private defaultMaxTokens: number
  private defaultTemperature: number

  constructor(config: ClaudeServiceConfig) {
    this.apiKey = config.apiKey
    this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022'
    this.defaultMaxTokens = config.defaultMaxTokens || 4096
    this.defaultTemperature = config.defaultTemperature || 1.0
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(
    messages: ClaudeMessage[],
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      system?: string
    }
  ): Promise<string> {
    const request: ClaudeRequest = {
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || this.defaultMaxTokens,
      messages,
      temperature: options?.temperature ?? this.defaultTemperature,
    }

    if (options?.system) {
      request.system = options.system
    }

    const response = await this.makeRequest<ClaudeResponse>('/messages', request)

    const firstContent = response.content?.[0]
    if (firstContent) {
      return firstContent.text
    }

    throw new Error('No content in Claude response')
  }

  /**
   * Send a simple text prompt to Claude
   */
  async prompt(
    text: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      system?: string
    }
  ): Promise<string> {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: text,
      },
    ]

    return this.sendMessage(messages, options)
  }

  /**
   * Make a request to the Claude API
   */
  private async makeRequest<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${CLAUDE_API_BASE_URL}${endpoint}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': CLAUDE_API_VERSION,
      },
      body: JSON.stringify(body),
      // @ts-expect-error - Node.js fetch supports agent option
      agent: httpsAgent,
    })

    if (!response.ok) {
      const errorData = (await response.json()) as {
        error?: { message?: string }
      }
      throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`)
    }

    return response.json() as Promise<T>
  }
}
