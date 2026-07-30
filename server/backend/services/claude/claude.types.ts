export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeRequest {
  model: string
  max_tokens: number
  messages: ClaudeMessage[]
  temperature?: number
  system?: string
}

export interface ClaudeResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: Array<{
    type: 'text'
    text: string
  }>
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence'
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface ClaudeError {
  type: 'error'
  error: {
    type: string
    message: string
  }
}

export interface ClaudeServiceConfig {
  apiKey: string
  defaultModel?: string
  defaultMaxTokens?: number
  defaultTemperature?: number
}
