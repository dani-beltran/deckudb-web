import { createAnthropic } from '@ai-sdk/anthropic'
import { getServerConfig } from '@server/config'
import type { LanguageModel } from 'ai'

/** Creates the configured Claude model without exposing provider credentials to callers. */
export function createClaudeModel(): LanguageModel {
  const { claudeAiModel, claudeApiKey } = getServerConfig()
  const anthropic = createAnthropic({ apiKey: claudeApiKey })
  return anthropic(claudeAiModel)
}
