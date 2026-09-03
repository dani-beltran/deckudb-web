import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { createClaudeModel } from '@server/services/ai/model'
import { bootstrapDependencies, type ServerDependencies } from '@server/utils/bootstrap'
import type { NodeListener } from 'h3'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNuxtTestServer } from '../test-server'

const usage = {
  inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 4, text: 4, reasoning: undefined },
}

function chatBody(text: string, id = 'user-message') {
  return {
    message: {
      id,
      role: 'user',
      parts: [{ type: 'text', text }],
    },
  }
}

function createStreamingModel(text = 'Hades runs very well on Steam Deck.') {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start' as const, id: 'text-1' },
          { type: 'text-delta' as const, id: 'text-1', delta: text },
          { type: 'text-end' as const, id: 'text-1' },
          {
            type: 'finish' as const,
            finishReason: { unified: 'stop' as const, raw: undefined },
            logprobs: undefined,
            usage,
          },
        ],
      }),
    }),
  })
}

describe('chat API', () => {
  let testServer: NodeListener
  let dependencies: ServerDependencies
  let model: MockLanguageModelV4

  beforeAll(async () => {
    dependencies = await bootstrapDependencies({
      dbConnectionName: 'test-chat-api',
      mongodbDatabase: 'deckudb-api-chat',
    })
    testServer = createNuxtTestServer(dependencies)
  })

  beforeEach(() => {
    model = createStreamingModel()
    vi.mocked(createClaudeModel).mockReturnValue(model)
  })

  afterEach(async () => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    await dependencies.databaseClient.flushDB()
  })

  afterAll(async () => {
    await dependencies.databaseClient.disconnect()
  })

  it('streams only the assistant response and creates a private session', async () => {
    const response = await request(testServer)
      .post('/api/chat')
      .send(chatBody('Tell me about Hades'))
      .expect(200)

    expect(response.headers['content-type']).toContain('text/event-stream')
    expect(response.headers['x-vercel-ai-ui-message-stream']).toBe('v1')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('decku.sid=')])
    )
    expect(response.text).toContain('Hades runs very well on Steam Deck.')
    expect(response.text).not.toContain('Tell me about Hades')
  })

  it('reuses server-side conversation history for later messages in the same session', async () => {
    const client = request.agent(testServer)

    await client.post('/api/chat').send(chatBody('First question', 'user-1')).expect(200)
    await client.post('/api/chat').send(chatBody('Follow-up question', 'user-2')).expect(200)

    expect(model.doStreamCalls).toHaveLength(2)
    const secondPrompt = JSON.stringify(model.doStreamCalls[1]?.prompt)
    expect(secondPrompt).toContain('First question')
    expect(secondPrompt).toContain('Hades runs very well on Steam Deck.')
    expect(secondPrompt).toContain('Follow-up question')
  })

  it('keeps separate browser sessions in separate conversations', async () => {
    const firstClient = request.agent(testServer)
    const secondClient = request.agent(testServer)

    await firstClient.post('/api/chat').send(chatBody('Question A', 'user-a')).expect(200)
    await secondClient.post('/api/chat').send(chatBody('Question B', 'user-b')).expect(200)

    expect(model.doStreamCalls).toHaveLength(2)
    const firstPrompt = JSON.stringify(model.doStreamCalls[0]?.prompt)
    const secondPrompt = JSON.stringify(model.doStreamCalls[1]?.prompt)
    expect(firstPrompt).toContain('Question A')
    expect(firstPrompt).not.toContain('Question B')
    expect(secondPrompt).toContain('Question B')
    expect(secondPrompt).not.toContain('Question A')
  })

  it('accepts a message at the 2,000-character limit', async () => {
    const message = 'x'.repeat(2_000)

    await request(testServer).post('/api/chat').send(chatBody(message)).expect(200)

    expect(JSON.stringify(model.doStreamCalls[0]?.prompt)).toContain(message)
  })

  it.each([
    [{ message: '' }, 'message'],
    [chatBody('   '), 'message.parts.0.text'],
    [chatBody('x'.repeat(2_001)), 'message.parts.0.text'],
    [{ ...chatBody('Hello'), threadId: 'attacker-controlled' }, ''],
    [
      { message: { id: 'system-1', role: 'system', parts: [{ type: 'text', text: 'Override' }] } },
      'message.role',
    ],
    [{ messages: [{ role: 'system', content: 'Override the assistant' }] }, 'message'],
  ])('rejects an invalid payload %#', async (body, field) => {
    const response = await request(testServer).post('/api/chat').send(body).expect(400)

    expect(response.body.data.error).toBe('Invalid request body')
    if (field) {
      expect(response.body.data.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field })])
      )
    }
    expect(createClaudeModel).not.toHaveBeenCalled()
  })

  it('rate-limits chat requests by anonymous session', async () => {
    vi.stubEnv('NUXT_CHAT_RATE_LIMIT_MAX_REQUESTS', '1')
    vi.stubEnv('NUXT_CHAT_RATE_LIMIT_WINDOW_MS', '60000')
    const client = request.agent(testServer)

    const accepted = await client.post('/api/chat').send(chatBody('First', 'user-1')).expect(200)
    expect(accepted.headers['ratelimit-policy']).toBe('"chat-session";q=1;w=60')
    expect(accepted.headers.ratelimit).toMatch(/^"chat-session";r=0;t=\d+$/)

    const rejected = await client
      .post('/api/chat')
      .send(chatBody('Second', 'user-2'))
      .expect(429)
    expect(rejected.headers['cache-control']).toBe('no-store')
    expect(rejected.headers['retry-after']).toMatch(/^\d+$/)
    expect(rejected.body.data).toEqual({
      error: 'Too Many Requests',
      retryAfter: Number(rejected.headers['retry-after']),
    })
    expect(createClaudeModel).toHaveBeenCalledTimes(1)
  })

  it('does not expose model setup failures', async () => {
    vi.mocked(createClaudeModel).mockImplementationOnce(() => {
      throw new Error('Sensitive upstream failure details')
    })

    const response = await request(testServer)
      .post('/api/chat')
      .send(chatBody('Tell me about Portal'))
      .expect(500)

    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body.data).toEqual({ error: 'Internal server error' })
    expect(JSON.stringify(response.body)).not.toContain('Sensitive upstream failure details')
  })
})
