import { TransformChain } from 'langchain/chains'

// Example: lowercase + strip punctuation
const transformChain = new TransformChain({
  inputVariables: ['text'],
  outputVariables: ['cleanText'],
  transform: async (values: Record<string, any>) => {
    let text = values.text as string
    text = text.toLowerCase().replace(/[^\w\s]/g, '')
    return { cleanText: text }
  },
})

async function main() {
  console.log('=== Transformer Chain ===')
  const result = await transformChain.invoke({
    text: "Hello WORLD!!! How's, it going!!?? What : is wheather outside today,!",
  })
  console.log(result)
}

main().catch(console.error)
