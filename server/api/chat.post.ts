import { createHash } from 'node:crypto'
import { getServerConfig } from '@server/config'
import {
  createClaudeModel,
  createDeckuBotTools,
  DECKUBOT_INSTRUCTIONS,
  type DeckuBotUIMessage,
} from '@server/services/ai'
import { apiHandler, getSessionId, parseBody } from '@server/utils/api'
import logger from '@server/utils/logger'
import { saveSession } from '@server/utils/session'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from 'ai'
import { createError, defineEventHandler, type H3Event, setResponseHeader } from 'h3'
import z from 'zod'

const MAX_STORED_CHAT_MESSAGES = 20

const chatBodySchema = z
  .object({
    message: z
      .object({
        id: z.string().trim().min(1).max(128),
        role: z.literal('user'),
        parts: z.tuple([
          z
            .object({
              type: z.literal('text'),
              text: z.string().trim().min(1, 'Message is required').max(2_000),
            })
            .strict(),
        ]),
      })
      .strict(),
  })
  .strict()

export type ChatRequest = z.infer<typeof chatBodySchema>

function getChatRateLimitPartitionKey(sessionId: string) {
  return createHash('sha256').update(`chat-session:${sessionId}`).digest('hex')
}

async function enforceChatRateLimit(
  event: H3Event,
  sessionId: string,
  config: ReturnType<typeof getServerConfig>
) {
  const { chatRateLimitEnabled, chatRateLimitMaxRequests, chatRateLimitWindowMs } = config
  if (!chatRateLimitEnabled) return {}

  const result = await event.context.repositories.rateLimits.consume(
    getChatRateLimitPartitionKey(sessionId),
    {
      limit: chatRateLimitMaxRequests,
      windowMs: chatRateLimitWindowMs,
    }
  )
  const windowSeconds = Math.ceil(chatRateLimitWindowMs / 1000)
  const headers = {
    'RateLimit-Policy': `"chat-session";q=${chatRateLimitMaxRequests};w=${windowSeconds}`,
    RateLimit: `"chat-session";r=${result.remaining};t=${result.resetSeconds}`,
  }

  for (const [name, value] of Object.entries(headers)) setResponseHeader(event, name, value)
  if (result.allowed) return headers

  setResponseHeader(event, 'Retry-After', result.resetSeconds)
  throw createError({
    statusCode: 429,
    statusMessage: 'Too Many Requests',
    data: {
      error: 'Too Many Requests',
      retryAfter: result.resetSeconds,
    },
  })
}

function trimChatHistory(messages: DeckuBotUIMessage[]) {
  const recentMessages = messages.slice(-MAX_STORED_CHAT_MESSAGES)
  const firstUserMessage = recentMessages.findIndex((message) => message.role === 'user')
  return firstUserMessage === -1 ? [] : recentMessages.slice(firstUserMessage)
}

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  return apiHandler<Response>(event, async () => {
    const { message } = await parseBody(event, chatBodySchema)
    const sessionId = getSessionId(event)
    const session = event.context.session
    if (!session) throw new Error('Session middleware is not configured')

    const serverConfig = getServerConfig()
    const rateLimitHeaders = await enforceChatRateLimit(event, sessionId, serverConfig)
    const tools = createDeckuBotTools(event.context.repositories)
    const storedMessages = Array.isArray(session.data.supportChatMessages)
      ? session.data.supportChatMessages
      : []
    const validation = await safeValidateUIMessages<DeckuBotUIMessage>({
      messages: storedMessages,
      tools,
    })

    if (!validation.success && storedMessages.length > 0) {
      logger.warn('Discarding invalid support chat history from the session')
    }

    const previousMessages = validation.success ? validation.data : []
    const conversation: DeckuBotUIMessage[] = [...previousMessages, message]
    const result = streamText({
      model: createClaudeModel(),
      instructions: DECKUBOT_INSTRUCTIONS,
      messages: await convertToModelMessages(conversation),
      tools,
      stopWhen: isStepCount(5),
      maxOutputTokens: 600,
      temperature: 0.3,
      timeout: { totalMs: 60_000 },
      telemetry: {
        isEnabled: true,
        functionId: 'deckubot-support-chat',
        recordInputs: serverConfig.sentryRecordChatContent,
        recordOutputs: serverConfig.sentryRecordChatContent,
      },
    })

    return createUIMessageStreamResponse({
      headers: {
        ...rateLimitHeaders,
        'Cache-Control': 'no-store',
      },
      stream: toUIMessageStream({
        stream: result.stream,
        tools,
        originalMessages: conversation,
        onEnd: async ({ messages, outcome }) => {
          if (outcome.status !== 'completed') return
          session.data.supportChatMessages = trimChatHistory(messages)
          await saveSession(event)
        },
        onError: (error) => {
          logger.error('Support chat stream error:', error)
          return 'I could not complete that response. Please try again.'
        },
      }),
    })
  })
})
