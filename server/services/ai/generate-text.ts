import { generateText } from 'ai'
import { createClaudeModel } from './model'

export type GenerateAITextOptions = {
  prompt: string
  instructions?: string
  maxOutputTokens?: number
  temperature?: number
}

/** Generates non-streaming text with DeckuDB's configured language model. */
export async function generateAIText({
  prompt,
  instructions,
  maxOutputTokens = 1_000,
  temperature,
}: GenerateAITextOptions): Promise<string> {
  const { text } = await generateText({
    model: createClaudeModel(),
    instructions,
    prompt,
    maxOutputTokens,
    temperature,
  })

  return text
}
