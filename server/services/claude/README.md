# Claude AI Service

A TypeScript service for interacting with Anthropic's Claude API.

## Features

- ✅ Type-safe API interactions
- ✅ Simple prompt-based interface
- ✅ Multi-turn conversation support
- ✅ System prompts
- ✅ Configurable models and parameters
- ✅ Error handling

## Setup

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Set the environment variable:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

Or add it to your `.env` file:

```
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

### Basic Example

```typescript
import { createClaudeService } from './services/claude';

const claude = createClaudeService();

// Simple prompt
const response = await claude.prompt("What is TypeScript?");
console.log(response);
```

### With Options

```typescript
const response = await claude.prompt(
  "Explain API design patterns",
  {
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 1000,
    temperature: 0.7,
    system: "You are an expert software architect"
  }
);
```

### Multi-turn Conversation

```typescript
const response = await claude.sendMessage([
  {
    role: "user",
    content: "What is a REST API?"
  },
  {
    role: "assistant",
    content: "A REST API is..."
  },
  {
    role: "user",
    content: "Can you give me an example?"
  }
]);
```

### Custom Configuration

```typescript
import { ClaudeService } from './services/claude';

const claude = new ClaudeService({
  apiKey: "your_api_key",
  defaultModel: "claude-3-5-sonnet-20241022",
  defaultMaxTokens: 2048,
  defaultTemperature: 0.5
});
```

## Available Models

- `claude-3-5-sonnet-20241022` (default) - Most intelligent model
- `claude-3-5-haiku-20241022` - Fastest model
- `claude-3-opus-20240229` - Previous generation, very capable
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast and compact

## API Reference

### `createClaudeService(apiKey?: string): ClaudeService`

Create a Claude service instance. Uses `ANTHROPIC_API_KEY` environment variable if no API key is provided.

### `claude.prompt(text: string, options?): Promise<string>`

Send a simple text prompt to Claude.

**Options:**
- `model?: string` - Claude model to use
- `maxTokens?: number` - Maximum tokens in response
- `temperature?: number` - Sampling temperature (0-1)
- `system?: string` - System prompt

### `claude.sendMessage(messages: ClaudeMessage[], options?): Promise<string>`

Send a multi-turn conversation to Claude.

**Message format:**
```typescript
{
  role: "user" | "assistant",
  content: string
}
```

## Error Handling

```typescript
try {
  const response = await claude.prompt("Hello!");
  console.log(response);
} catch (error) {
  console.error("Claude API error:", error.message);
}
```

## Cost Considerations

Claude API charges based on input and output tokens. The service includes usage information in responses. See [Anthropic's pricing](https://www.anthropic.com/pricing) for current rates.

## Resources

- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Claude API Reference](https://docs.anthropic.com/claude/reference/messages_post)
- [Anthropic Console](https://console.anthropic.com/)
