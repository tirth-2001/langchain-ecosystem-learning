# Prompt Utilities

This directory contains utilities for handling prompt templates with JSON examples, specifically designed to solve the common problem of template parsing errors when using curly braces in JSON examples.

## Problem

When using LangChain's `ChatPromptTemplate`, curly braces `{}` in JSON examples are interpreted as template variables, causing parsing errors like:

```
Error: Single '}' in template.
```

## Solution

The `promptUtils.ts` file provides several utilities to automatically handle brace escaping:

### 1. `escapeTemplateBraces(text: string)`

Basic function to escape curly braces in any text:

```typescript
import { escapeTemplateBraces } from './utils/promptUtils'

const jsonExample = `{
  "name": "John",
  "age": 30
}`

const escaped = escapeTemplateBraces(jsonExample)
// Result: `{{
//   "name": "John",
//   "age": 30
// }}`
```

### 2. `createPromptWithJsonExamples(messages, jsonExamples)`

Convenience function that automatically escapes JSON examples:

```typescript
import { createPromptWithJsonExamples } from './utils/promptUtils'

const prompt = createPromptWithJsonExamples(
  [
    ['system', 'You are a helpful assistant.'],
    ['human', 'Generate JSON like this:\n\n{jsonSchema}\n\nExample:\n{jsonExample}'],
  ],
  [
    `{
    "name": "string",
    "age": "number"
  }`,
    `{
    "name": "John",
    "age": 30
  }`,
  ],
)
```

### 3. `createSelectiveEscapedPrompt(messages)`

For more control, escape only specific parts of your prompt:

```typescript
import { createSelectiveEscapedPrompt } from './utils/promptUtils'

const prompt = createSelectiveEscapedPrompt([
  {
    role: 'system',
    content: 'You are a helpful assistant.',
    escapeBraces: false, // No escaping needed
  },
  {
    role: 'human',
    content: `Generate JSON like this: {jsonExample}`,
    escapeBraces: true, // This part needs escaping
  },
])
```

### 4. `createJsonExamplesBlock(examples, title)`

Helper to create formatted JSON example blocks:

```typescript
import { createJsonExamplesBlock } from './utils/promptUtils'

const examplesBlock = createJsonExamplesBlock(
  [
    {
      name: 'Basic Example',
      json: { name: 'John', age: 30 },
    },
    {
      name: 'Advanced Example',
      json: { name: 'John', age: 30, address: { city: 'NYC' } },
    },
  ],
  'Examples:',
)
```

### 5. `validatePromptTemplate(template)`

Validate that your prompt template won't cause parsing errors:

```typescript
import { validatePromptTemplate } from './utils/promptUtils'

const validation = await validatePromptTemplate(myPrompt)
if (!validation.isValid) {
  console.error('Template errors:', validation.errors)
}
if (validation.warnings.length > 0) {
  console.warn('Template warnings:', validation.warnings)
}
```

## Usage Patterns

### Pattern 1: Simple JSON Examples

```typescript
const prompt = createPromptWithJsonExamples(
  [
    ['system', 'You are a JSON generator.'],
    ['human', 'Generate JSON like this:\n\n{jsonSchema}'],
  ],
  [jsonSchemaString],
)
```

### Pattern 2: Mixed Content

```typescript
const prompt = createSelectiveEscapedPrompt([
  {
    role: 'system',
    content: 'You are a helpful assistant.',
    escapeBraces: false,
  },
  {
    role: 'human',
    content: `Process this data and return JSON: {jsonExample}`,
    escapeBraces: true,
  },
])
```

### Pattern 3: Dynamic Examples

```typescript
function createDynamicPrompt(examples: any[]) {
  const jsonExamples = examples.map((example) => JSON.stringify(example, null, 2))
  return createPromptWithJsonExamples(
    [
      ['system', 'You are a dynamic generator.'],
      ['human', 'Generate based on these examples:\n\n{jsonExample}'],
    ],
    jsonExamples,
  )
}
```

## Best Practices

1. **Use the utilities**: Don't manually escape braces - use the provided utilities
2. **Validate templates**: Use `validatePromptTemplate` in tests
3. **Separate concerns**: Keep JSON examples separate from prompt logic
4. **Document examples**: Use descriptive names for JSON examples
5. **Test thoroughly**: Always test your prompts with real data

## Migration Guide

### Before (Error-prone):

```typescript
const prompt = ChatPromptTemplate.fromMessages([
  [
    'human',
    `Generate JSON like this: {
    "name": "string"
  }`,
  ],
])
// ❌ This will cause parsing errors
```

### After (Safe):

```typescript
const prompt = createPromptWithJsonExamples(
  [['human', 'Generate JSON like this:\n\n{jsonExample}']],
  [
    `{
  "name": "string"
}`,
  ],
)
// ✅ This works correctly
```

## Examples

See `examples/promptUtilsExamples.ts` for comprehensive usage examples covering different scenarios and patterns.
