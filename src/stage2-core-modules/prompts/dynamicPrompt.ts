/**
 * src/stage2-core-modules/prompts/dynamicPrompt.ts
 *
 * Demonstrates advanced PromptTemplate usage:
 * - reusable templates
 * - default handling & pre-processing
 * - few-shot examples injected into templates
 * - token logging via CallbackManager
 *
 * Run:
 * npx ts-node src/stage2-core-modules/prompts/dynamicPrompt.ts
 */

import { CallbackManager } from '@langchain/core/callbacks/manager'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import 'dotenv/config'
import { LLMChain } from 'langchain/chains'

type ProductInput = {
  productName: string
  tone?: string // e.g., "casual" | "professional"
  features?: string[] // short list
}

type EmailInput = {
  fromName: string
  toName: string
  purpose: string
  length?: 'short' | 'medium' | 'long'
}

const callbackManager = CallbackManager.fromHandlers({
  async handleLLMEnd(output) {
    // LangChain puts tokens in llmOutput.tokenUsage if available
    const totalTokens = output.llmOutput?.tokenUsage?.totalTokens ?? 'N/A'
    console.log('[callback] total tokens used:', totalTokens)
  },
  async handleLLMStart(_llm, prompts) {
    console.log('[callback] LLM start. Prompt count:', prompts?.length ?? 0)
  },
})

// helper: safe defaults & normalization
function normalizeProductInput(input: Partial<ProductInput>): ProductInput {
  return {
    productName: (input.productName || 'Unknown Product').trim(),
    tone: input.tone || 'professional',
    features: input.features && input.features.length ? input.features.slice(0, 3) : ['feature A', 'feature B'],
  }
}

function normalizeEmailInput(input: Partial<EmailInput>): EmailInput {
  return {
    fromName: input.fromName || 'Sender',
    toName: input.toName || 'Recipient',
    purpose: input.purpose || 'Follow up on previous message',
    length: input.length || 'short',
  }
}

// === Prompt templates ===

// 1) Product description template (reusable)
const productTemplate = new PromptTemplate({
  template: `
You are a concise marketing assistant.
Task: Write a product description for "{productName}" in a {tone} tone.
Constraints:
- Keep description <= 55 words.
- Provide 2 key bullet features (one-line each).
- Add a 1-line tagline at the end.
Product features (if provided): {features}
`,
  inputVariables: ['productName', 'tone', 'features'],
})

// 2) Email template with parameterized length
const emailTemplate = new PromptTemplate({
  template: `
You are a professional email writer.
From: {fromName}
To: {toName}
Purpose: {purpose}

Write an email with the requested tone and length.
Length: {length}
Constraints:
- Greeting, 2-3 body lines, polite closing.
`,
  inputVariables: ['fromName', 'toName', 'purpose', 'length'],
})

// 3) Few-shot template pattern: inject examples dynamically
const fewShotTemplate = new PromptTemplate({
  template: `
You are an assistant that rewrites user text into a target style.

Examples:
{examples}

Now rewrite the following text:
"{text_input}"
Constraints:
- Preserve meaning.
- Use the target style from examples.
`,
  inputVariables: ['examples', 'text_input'],
})

// === Setup LLM ===
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.3,
  openAIApiKey: process.env.OPENAI_API_KEY,
  callbackManager,
})

// Helpers that create chains and call them
async function generateProductDescription(input: Partial<ProductInput>) {
  const normalized = normalizeProductInput(input)
  const chain = new LLMChain({
    llm,
    prompt: productTemplate,
  })

  console.log('\n--- Formatted Product Prompt ---')
  // You can inspect the prompt by calling the template format (via calling chain with input)
  // To avoid duplicate LLM calls, we'll print the filled template text manually:
  // LangChain PromptTemplate doesn't expose a simple .formatSync that is guaranteed across versions,
  // so for debugging we'll construct a debug string:
  const debugPrompt = `
System: You are a concise marketing assistant.
Product: ${normalized.productName}
Tone: ${normalized.tone}
Features: ${JSON.stringify(normalized.features)}
`
  console.log(debugPrompt)

  const res = await chain.call({
    productName: normalized.productName,
    tone: normalized.tone,
    features: normalized?.features?.join(', '),
  })

  console.log('\n[Product Description Result]')
  console.log(res.text)
  return res
}

async function generateEmail(input: Partial<EmailInput>) {
  const normalized = normalizeEmailInput(input)
  const chain = new LLMChain({
    llm,
    prompt: emailTemplate,
  })

  console.log('\n--- Formatted Email Prompt ---')
  console.log(
    `From: ${normalized.fromName}\nTo: ${normalized.toName}\nPurpose: ${normalized.purpose}\nLength: ${normalized.length}`,
  )

  const res = await chain.call({
    fromName: normalized.fromName,
    toName: normalized.toName,
    purpose: normalized.purpose,
    length: normalized.length,
  })

  console.log('\n[Email Result]')
  console.log(res.text)
  return res
}

async function fewShotRewrite(textToRewrite: string) {
  // create small examples that define the target style
  const examples = [
    'Original: "I am thinking of this product."\nStylish: "I am enamored with this offering."',
    'Original: "The app crashed."\nStylish: "The application encountered an unexpected termination."',
  ].join('\n\n')

  const chain = new LLMChain({
    llm,
    prompt: fewShotTemplate,
  })

  console.log('\n--- Few-shot Prompt ---')
  console.log('Examples:\n', examples)
  const res = await chain.call({
    examples,
    text_input: textToRewrite,
  })

  console.log('\n[Few-shot Rewrite Result]')
  console.log(res.text)
  return res
}

// Run sample flows
async function main() {
  console.log('== Prompt Engineering examples ==')

  await generateProductDescription({
    productName: 'Acme Solar Charger',
    tone: 'casual',
    features: ['fast charging', 'water resistant', '2-year warranty'],
  })

  await generateEmail({
    fromName: 'Tirth',
    toName: 'Product Team',
    purpose: 'Share the roadmap updates and request feedback',
    length: 'short',
  })

  await fewShotRewrite('The server returned an error when I tried to upload the file.')
}

main().catch((err) => {
  console.error('Error in prompt examples:', err)
})
