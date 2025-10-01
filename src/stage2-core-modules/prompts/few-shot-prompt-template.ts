import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts'

// Example dataset (could come from a DB or embeddings selector)
const examples = [
  { word: 'happy', antonym: 'sad' },
  { word: 'tall', antonym: 'short' },
]

// How each example should look in the prompt
const examplePrompt = new PromptTemplate({
  inputVariables: ['word', 'antonym'],
  template: 'Word: {word} → Antonym: {antonym}',
})

// FewShotPromptTemplate definition
const fewShotPrompt = new FewShotPromptTemplate({
  examples,
  examplePrompt,
  prefix: 'Give the antonym for each input word.\n\nExamples:',
  suffix: '\n\nWord: {input}\nAntonym:',
  inputVariables: ['input'], // only the user input comes at runtime
})

// Generate the final formatted prompt
async function runDemo() {
  const formattedPrompt = await fewShotPrompt.format({ input: 'big' })
  console.log(formattedPrompt)
}

runDemo().catch(console.error)

/*
Expected Output:

Give the antonym for each input word.

Examples:
Word: happy → Antonym: sad
Word: tall → Antonym: short

Word: big
Antonym:
*/
