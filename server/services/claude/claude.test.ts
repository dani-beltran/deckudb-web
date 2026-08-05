import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClaudeService from './ClaudeService'
import type { ClaudeResponse } from './claude.types'

// Mock fetch
global.fetch = vi.fn()

describe('ClaudeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with default values', () => {
      const service = new ClaudeService({ apiKey: 'test-key' })
      expect(service).toBeInstanceOf(ClaudeService)
    })

    it('should accept custom configuration', () => {
      const service = new ClaudeService({
        apiKey: 'test-key',
        defaultModel: 'claude-3-opus-20240229',
        defaultMaxTokens: 2048,
        defaultTemperature: 0.5,
      })
      expect(service).toBeInstanceOf(ClaudeService)
    })
  })

  describe('prompt', () => {
    it('should send a simple prompt and return text response', async () => {
      const mockResponse: ClaudeResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: "Hello! I'm Claude.",
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const service = new ClaudeService({ apiKey: 'test-key' })
      const response = await service.prompt('Hello')

      expect(response).toBe("Hello! I'm Claude.")
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      )
    })

    it('should use custom options', async () => {
      const mockResponse: ClaudeResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const service = new ClaudeService({ apiKey: 'test-key' })
      await service.prompt('Test', {
        model: 'claude-3-opus-20240229',
        maxTokens: 500,
        temperature: 0.7,
        system: 'You are helpful',
      })

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.model).toBe('claude-3-opus-20240229')
      expect(body.max_tokens).toBe(500)
      expect(body.temperature).toBe(0.7)
      expect(body.system).toBe('You are helpful')
    })
  })

  describe('sendMessage', () => {
    it('should send multiple messages', async () => {
      const mockResponse: ClaudeResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Sure, I can help!' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const service = new ClaudeService({ apiKey: 'test-key' })
      const response = await service.sendMessage([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'Can you help me?' },
      ])

      expect(response).toBe('Sure, I can help!')

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.messages).toHaveLength(3)
      expect(body.messages[0].role).toBe('user')
      expect(body.messages[1].role).toBe('assistant')
    })
  })

  describe('error handling', () => {
    it('should throw error when API returns error', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            type: 'invalid_request_error',
            message: 'Invalid API key',
          },
        }),
      })

      const service = new ClaudeService({ apiKey: 'test-key' })

      await expect(service.prompt('Hello')).rejects.toThrow('Claude API error: Invalid API key')
    })

    it('should throw error when response has no content', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 0 },
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const service = new ClaudeService({ apiKey: 'test-key' })

      await expect(service.prompt('Hello')).rejects.toThrow('No content in Claude response')
    })
  })
})
