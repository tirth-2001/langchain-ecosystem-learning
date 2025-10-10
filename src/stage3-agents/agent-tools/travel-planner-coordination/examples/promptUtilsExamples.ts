// examples/promptUtilsExamples.ts
import {
  createPromptWithJsonExamples,
  createSelectiveEscapedPrompt,
  createJsonExamplesBlock,
  validatePromptTemplate,
} from '../utils/promptUtils'

/**
 * Examples demonstrating different ways to use the prompt utilities
 * for handling JSON examples and template escaping.
 */

// Example 1: Simple JSON examples with automatic escaping
export const simpleJsonPrompt = createPromptWithJsonExamples(
  [
    ['system', 'You are a helpful assistant that outputs JSON.'],
    ['human', 'Generate a user profile with the following structure:\n\n{jsonSchema}\n\nExample:\n{jsonExample}'],
  ],
  [
    `{
  "name": "string",
  "age": "number",
  "email": "string"
}`,
    `{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com"
}`,
  ],
)

// Example 2: Selective escaping - only escape specific parts
export const selectiveEscapedPrompt = createSelectiveEscapedPrompt([
  {
    role: 'system',
    content: 'You are a data processor.',
    escapeBraces: false, // No escaping needed
  },
  {
    role: 'human',
    content: `Process this data and return JSON in this format:

{jsonFormat}

Rules:
- Use the exact field names shown
- All values should be strings
- Return only valid JSON`,
    escapeBraces: true, // This part needs escaping
  },
])

// Example 3: Using the JSON examples block helper
export const blockExamplesPrompt = createPromptWithJsonExamples([
  ['system', 'You are a configuration generator.'],
  [
    'human',
    `Generate a configuration file based on the user's requirements.

${createJsonExamplesBlock(
  [
    {
      name: 'Basic Config',
      json: {
        name: 'my-app',
        version: '1.0.0',
        port: 3000,
      },
    },
    {
      name: 'Advanced Config',
      json: {
        name: 'my-app',
        version: '1.0.0',
        port: 3000,
        database: {
          host: 'localhost',
          port: 5432,
        },
        features: ['auth', 'logging'],
      },
    },
  ],
  'Configuration Examples:',
)}

Please generate a similar configuration based on the user's input: {input}`,
  ],
])

// Example 4: Complex multi-step prompt with mixed content
export const complexPrompt = createSelectiveEscapedPrompt([
  {
    role: 'system',
    content: 'You are an API documentation generator.',
    escapeBraces: false,
  },
  {
    role: 'human',
    content: `Generate API documentation for the following endpoint.

Endpoint: {endpoint}
Method: {method}

Response Format:
{
  "status": "success|error",
  "data": {
    "id": "string",
    "name": "string",
    "created_at": "ISO string"
  },
  "message": "string"
}

Example Response:
{
  "status": "success",
  "data": {
    "id": "123",
    "name": "Sample Item",
    "created_at": "2023-01-01T00:00:00Z"
  },
  "message": "Item created successfully"
}

Please generate documentation for: {input}`,
    escapeBraces: true,
  },
])

// Example 5: Validation function usage
export async function validatePrompts() {
  console.log('Validating simple JSON prompt...')
  const simpleValidation = await validatePromptTemplate(simpleJsonPrompt)
  console.log('Simple prompt validation:', simpleValidation)

  console.log('Validating selective escaped prompt...')
  const selectiveValidation = await validatePromptTemplate(selectiveEscapedPrompt)
  console.log('Selective prompt validation:', selectiveValidation)

  console.log('Validating block examples prompt...')
  const blockValidation = await validatePromptTemplate(blockExamplesPrompt)
  console.log('Block examples validation:', blockValidation)

  console.log('Validating complex prompt...')
  const complexValidation = await validatePromptTemplate(complexPrompt)
  console.log('Complex prompt validation:', complexValidation)
}

// Example 6: Manual escaping for edge cases
import { escapeTemplateBraces } from '../utils/promptUtils'

export const manualEscapingExample = `
Here's some JSON that needs escaping:
${escapeTemplateBraces(`{
  "complex": {
    "nested": {
      "object": "with braces"
    }
  }
}`)}

And here's some text that doesn't need escaping:
This is just regular text with {variables} that should be processed normally.
`

// Example 7: Building prompts dynamically
export function createDynamicPrompt(userRequirements: string[], examples: any[]) {
  const jsonExamples = examples.map((example) => JSON.stringify(example, null, 2))

  return createPromptWithJsonExamples(
    [
      ['system', 'You are a dynamic prompt generator.'],
      [
        'human',
        `Based on these requirements: ${userRequirements.join(', ')}

Generate a response following this pattern:

{jsonSchema}

Examples:
{jsonExample}

User input: {input}`,
      ],
    ],
    jsonExamples,
  )
}
