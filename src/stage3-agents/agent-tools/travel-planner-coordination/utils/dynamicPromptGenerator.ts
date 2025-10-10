// utils/dynamicPromptGenerator.ts
import { createPromptWithJsonExamples } from './promptUtils'
import { TOOL_DEFINITIONS, getToolNamesUnion, getToolNames, validateToolRegistry } from './toolRegistry'

/**
 * Dynamic prompt generator that automatically creates prompts based on the tool registry.
 * This eliminates hardcoded tool names and makes the system maintainable.
 */

/**
 * Generate the JSON schema example dynamically based on available tools
 */
function generateJsonSchemaExample(): string {
  const toolNamesUnion = getToolNamesUnion()

  return `{
  "city": "<optional city name>",
  "steps": [
    {
      "id": "s1",
      "tool": "${toolNamesUnion}",
      "args": { /* tool-specific args */ },
      "dependsOn": ["s0"] /* optional - step ids to wait for */,
      "parallelGroup": "groupA" /* optional label for parallel grouping */
    }
  ]
}

REQUIRED FIELDS:
- Every step MUST have an "id" field (string)
- Every step MUST have a "tool" field (one of: ${getToolNamesUnion()})
- Every step MUST have an "args" field (object with tool-specific arguments)
- "dependsOn" is optional (array of step ids)
- "parallelGroup" is optional (string)`
}

/**
 * Generate a realistic example based on available tools
 */
function generateRealisticExample(): string {
  // Find tools that make sense for a travel planning sequence
  const weatherTool = TOOL_DEFINITIONS.find((t) => t.name === 'WeatherLookup')
  const attractionTool = TOOL_DEFINITIONS.find((t) => t.name === 'AttractionSearch')
  const hotelTool = TOOL_DEFINITIONS.find((t) => t.name === 'HotelSearch')
  const formatterTool = TOOL_DEFINITIONS.find((t) => t.name === 'ItineraryFormatter')

  const steps = []
  let stepId = 1

  if (weatherTool) {
    steps.push({
      id: `s${stepId++}`,
      tool: weatherTool.name,
      args: weatherTool.exampleArgs,
    })
  }

  if (attractionTool) {
    steps.push({
      id: `s${stepId++}`,
      tool: attractionTool.name,
      args: attractionTool.exampleArgs,
    })
  }

  if (hotelTool) {
    steps.push({
      id: `s${stepId++}`,
      tool: hotelTool.name,
      args: hotelTool.exampleArgs,
    })
  }

  if (formatterTool) {
    steps.push({
      id: `s${stepId++}`,
      tool: formatterTool.name,
      args: formatterTool.exampleArgs,
      dependsOn: [`s1`, `s2`, `s3`],
    })
  }

  return JSON.stringify(
    {
      city: 'Kyoto',
      steps,
    },
    null,
    2,
  )
}

/**
 * Generate tool-specific rules based on available tools
 */
function generateToolRules(): string[] {
  const rules = [
    'Output only the JSON object (no commentary, no code fencing).',
    `Use the exact tool names: ${getToolNamesUnion()}.`,
    'CRITICAL: Every step MUST have an "id" field (string) - this is required for execution.',
    'CRITICAL: Every step MUST have a "tool" field with exact tool name.',
    'CRITICAL: Every step MUST have an "args" field with tool-specific arguments.',
    'Provide valid args for each tool based on their schemas (see examples below).',
    'Make dependencies explicit (use dependsOn when a step needs predecessor results).',
    'Keep the plan deterministic and simple.',
    'IMPORTANT: For ItineraryFormatter, pass actual values in args, not dependency references.',
    'Step IDs should be unique strings like "s1", "s2", "s3", etc.',
  ]

  // Add tool-specific guidance with example args
  const toolGuidance = TOOL_DEFINITIONS.map((tool) => {
    const exampleArgs = JSON.stringify(tool.exampleArgs, null, 2)
    return `- ${tool.name}: ${tool.description}\n  Example args: ${exampleArgs}`
  }).join('\n\n')

  if (toolGuidance) {
    rules.push('\nTool Descriptions and Example Args:')
    rules.push(toolGuidance)
  }

  return rules
}

/**
 * Generate the complete planner prompt dynamically
 */
export function generatePlannerPrompt() {
  // Validate tool registry before generating prompt
  const validation = validateToolRegistry()
  if (!validation.isValid) {
    throw new Error(`Tool registry validation failed: ${validation.errors.join(', ')}`)
  }

  const jsonSchemaExample = generateJsonSchemaExample()
  const realisticExample = generateRealisticExample()
  const rules = generateToolRules()

  const jsonExamples = [jsonSchemaExample, realisticExample]

  return createPromptWithJsonExamples(
    [
      [
        'system',
        'You are a travel-planning assistant. Your job is to output a STRICT JSON plan describing which tools to run and in what order.',
      ],
      [
        'human',
        `User request: {input}

Please output ONLY valid JSON that matches this shape:

{jsonSchema}

Rules:
${rules.join('\n')}

EXAMPLE:
{jsonExample}
`,
      ],
    ],
    jsonExamples,
  )
}

/**
 * Generate a tool documentation prompt for debugging/development
 */
export function generateToolDocumentationPrompt() {
  const toolDocs = TOOL_DEFINITIONS.map(
    (tool) =>
      `## ${tool.name}
- Description: ${tool.description}
- Example Args: ${JSON.stringify(tool.exampleArgs, null, 2)}
- Usage: ${tool.exampleUsage}`,
  ).join('\n\n')

  return createPromptWithJsonExamples([
    ['system', 'You are a tool documentation assistant. Generate comprehensive documentation for the available tools.'],
    [
      'human',
      `Generate documentation for these tools:

${toolDocs}

Please create user-friendly documentation that explains how to use each tool effectively.`,
    ],
  ])
}

/**
 * Generate a prompt for testing tool combinations
 */
export function generateToolTestingPrompt() {
  const toolNames = getToolNames()

  return createPromptWithJsonExamples([
    ['system', 'You are a tool testing assistant. Generate test scenarios for tool combinations.'],
    [
      'human',
      `Available tools: ${toolNames.join(', ')}

Generate test scenarios that demonstrate:
1. Individual tool usage
2. Tool combinations with dependencies
3. Parallel tool execution
4. Error handling scenarios

For each scenario, provide:
- Description of the test case
- Expected JSON plan
- Expected outcomes`,
    ],
  ])
}
