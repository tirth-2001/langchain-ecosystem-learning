// utils/promptUtils.ts
import { ChatPromptTemplate } from '@langchain/core/prompts'

/**
 * Utility functions for handling prompt templates with JSON examples
 * that need to escape curly braces to avoid template parsing conflicts.
 */

/**
 * Escapes curly braces in a string to prevent LangChain template parsing issues.
 * Converts { to {{ and } to }} so they render as literal braces in the final prompt.
 *
 * @param text - The text containing JSON or other content with curly braces
 * @returns The text with escaped braces
 */
export function escapeTemplateBraces(text: string): string {
  return text.replace(/\{/g, '{{').replace(/\}/g, '}}')
}

/**
 * Creates a ChatPromptTemplate with automatic brace escaping for JSON examples.
 * This is a convenience wrapper that handles the common pattern of having
 * JSON examples in prompts that need to be escaped.
 *
 * @param messages - Array of [role, content] tuples for the prompt
 * @param jsonExamples - Array of strings containing JSON examples that need escaping
 * @returns ChatPromptTemplate with properly escaped content
 */
export function createPromptWithJsonExamples(
  messages: Array<[string, string]>,
  jsonExamples: string[] = [],
): ChatPromptTemplate {
  // Escape all JSON examples
  const escapedExamples = jsonExamples.map(escapeTemplateBraces)

  // Process messages and escape any content that contains JSON-like patterns
  const processedMessages = messages.map(([role, content]) => {
    // Check if content looks like it contains JSON examples (has { and } patterns)
    if (content.includes('{') && content.includes('}')) {
      // Only escape if it's not already escaped (doesn't contain {{ or }})
      if (!content.includes('{{') && !content.includes('}}')) {
        content = escapeTemplateBraces(content)
      }
    }
    return [role, content] as [string, string]
  })

  return ChatPromptTemplate.fromMessages(processedMessages)
}

/**
 * Advanced prompt builder that allows you to specify which parts should be escaped.
 * Useful when you have mixed content where some parts need escaping and others don't.
 *
 * @param messages - Array of message objects with role, content, and optional escape flag
 * @returns ChatPromptTemplate with selective escaping
 */
export function createSelectiveEscapedPrompt(
  messages: Array<{
    role: string
    content: string
    escapeBraces?: boolean
  }>,
): ChatPromptTemplate {
  const processedMessages = messages.map(({ role, content, escapeBraces = false }) => {
    const finalContent = escapeBraces ? escapeTemplateBraces(content) : content
    return [role, finalContent] as [string, string]
  })

  return ChatPromptTemplate.fromMessages(processedMessages)
}

/**
 * Validates that a prompt template doesn't have unescaped braces that could cause parsing errors.
 * Useful for testing and debugging prompt templates.
 *
 * @param template - The ChatPromptTemplate to validate
 * @returns Object with validation results
 */
export async function validatePromptTemplate(template: ChatPromptTemplate): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Try to format with dummy data to catch parsing errors
    const dummyData = { input: 'test' }
    await template.format(dummyData)
  } catch (error) {
    errors.push(`Template parsing error: ${error}`)
  }

  // Check for potential issues by examining the prompt messages
  try {
    const messages = template.promptMessages
    for (const message of messages) {
      if ('content' in message && typeof message.content === 'string') {
        const content = message.content
        if (content.includes('{') && !content.includes('{{')) {
          warnings.push('Found unescaped braces that might cause parsing issues')
        }
      }
    }
  } catch (e) {
    // If we can't inspect the template structure, just skip the warning check
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Helper function to create JSON example blocks that are automatically escaped.
 * Useful for building prompts with multiple JSON examples.
 *
 * @param examples - Array of JSON example objects
 * @param title - Optional title for the examples section
 * @returns Formatted and escaped JSON examples string
 */
export function createJsonExamplesBlock(
  examples: Array<{ name: string; json: any }>,
  title: string = 'Examples:',
): string {
  const examplesText = examples.map(({ name, json }) => `${name}:\n${JSON.stringify(json, null, 2)}`).join('\n\n')

  return escapeTemplateBraces(`${title}\n\n${examplesText}`)
}
