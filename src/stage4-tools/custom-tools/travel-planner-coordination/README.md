# Travel Planner Coordination System

A scalable, maintainable travel planning system built with LangChain that uses dynamic prompt generation and centralized tool management.

## 🚀 Key Features

- **Dynamic Prompt Generation**: No hardcoded tool names in prompts
- **Centralized Tool Registry**: Single source of truth for all tools
- **Automatic Validation**: Built-in tool registry validation
- **Scalable Architecture**: Easy to add/remove/modify tools
- **Template Escaping**: Automatic handling of JSON examples in prompts
- **Dependency Resolution**: Parallel execution with dependency management

## 📁 Project Structure

```
travel-planner-coordination/
├── utils/
│   ├── toolRegistry.ts          # Central tool registry and definitions
│   ├── dynamicPromptGenerator.ts # Dynamic prompt generation
│   ├── promptUtils.ts           # Template escaping utilities
│   ├── sessionStore.ts          # Session management
│   ├── retry.ts                 # Retry and timeout utilities
│   └── zodSchemas.ts            # Type-safe schemas
├── tools/
│   ├── attractionSearch.ts      # Attraction search tool
│   ├── weatherLookup.ts         # Weather lookup tool
│   ├── hotelSearch.ts           # Hotel search tool
│   └── itineraryFormatter.ts    # Itinerary formatting tool
├── prompts/
│   └── plannerPrompt.ts         # Dynamically generated prompt
├── orchestrator/
│   └── travelOrchestrator.ts    # Main orchestration logic
├── examples/
│   ├── promptUtilsExamples.ts   # Prompt utility examples
│   └── addingNewTools.ts        # How to add new tools
└── index.ts                     # Entry point
```

## 🛠️ Adding New Tools

### Step 1: Create the Tool

```typescript
// tools/newTool.ts
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

export const NewTool = new DynamicStructuredTool({
  name: 'NewTool',
  description: 'Description of what the tool does.',
  schema: z.object({
    // Define your schema
  }),
  func: async (input: unknown) => {
    // Implement your logic
    return JSON.stringify(result)
  },
})
```

### Step 2: Add to Tool Registry

```typescript
// utils/toolRegistry.ts
import { NewTool } from '../tools/newTool'

// Add to TOOL_REGISTRY
export const TOOL_REGISTRY: Record<string, any> = {
  // ... existing tools
  NewTool,
}

// Add to TOOL_DEFINITIONS
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ... existing definitions
  {
    name: 'NewTool',
    description: 'Description of what the tool does.',
    exampleArgs: {
      /* example arguments */
    },
    exampleUsage: 'How to use this tool effectively',
  },
]
```

### Step 3: That's It!

The system automatically:

- ✅ Updates the prompt with the new tool name
- ✅ Includes the tool in validation
- ✅ Generates appropriate examples
- ✅ Updates all documentation

## 🔧 Usage

### Basic Usage

```typescript
import { runTravelPlanner } from './orchestrator/travelOrchestrator'

const result = await runTravelPlanner('session-1', 'Plan a 2-day trip to Kyoto with attractions and weather')
```

### Custom Tool Registry

```typescript
import { TOOL_REGISTRY, validateToolRegistry } from './utils/toolRegistry'

// Validate your tool registry
const validation = validateToolRegistry()
if (!validation.isValid) {
  console.error('Tool registry errors:', validation.errors)
}

// Access tools dynamically
const tool = TOOL_REGISTRY['AttractionSearch']
```

### Dynamic Prompt Generation

```typescript
import { generatePlannerPrompt } from './utils/dynamicPromptGenerator'

// Generate prompt with current tools
const prompt = generatePlannerPrompt()

// Generate documentation prompt
const docPrompt = generateToolDocumentationPrompt()
```

## 🎯 Benefits

### Before (Hardcoded)

```typescript
// ❌ Hardcoded tool names everywhere
const prompt = ChatPromptTemplate.fromMessages([['human', `Use tools: AttractionSearch, WeatherLookup, HotelSearch`]])

// ❌ Manual updates required in multiple places
// ❌ Error-prone when adding/removing tools
// ❌ Inconsistent tool definitions
```

### After (Dynamic)

```typescript
// ✅ Dynamic generation from registry
const prompt = generatePlannerPrompt()

// ✅ Single source of truth
// ✅ Automatic updates
// ✅ Built-in validation
// ✅ Consistent definitions
```

## 🧪 Testing

### Validate Tool Registry

```typescript
import { validateToolRegistry } from './utils/toolRegistry'

const validation = validateToolRegistry()
console.log('Valid:', validation.isValid)
console.log('Errors:', validation.errors)
```

### Test Prompt Generation

```typescript
import { validatePromptTemplate } from './utils/promptUtils'
import { generatePlannerPrompt } from './utils/dynamicPromptGenerator'

const prompt = generatePlannerPrompt()
const validation = await validatePromptTemplate(prompt)
console.log('Prompt valid:', validation.isValid)
```

## 🔍 Architecture

### Tool Registry Pattern

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Tool Files    │───▶│  Tool Registry   │───▶│ Dynamic Prompts │
│                 │    │                  │    │                 │
│ - AttractionSearch│    │ - TOOL_REGISTRY  │    │ - Auto-generated│
│ - WeatherLookup  │    │ - TOOL_DEFINITIONS│    │ - No hardcoding │
│ - HotelSearch    │    │ - Validation     │    │ - Always current│
│ - ItineraryFormatter│  │ - Helper functions│   │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Execution Flow

```
User Input → Planner LLM → JSON Plan → Tool Registry → Parallel Execution → Results
     ↓              ↓           ↓            ↓              ↓
  Session      Dynamic      Zod         Dependency      Itinerary
  Store        Prompt      Validation   Resolution      Formatter
```

## 🚨 Error Handling

The system includes comprehensive error handling:

- **Tool Registry Validation**: Ensures all tools have definitions
- **Prompt Template Validation**: Catches parsing errors early
- **Tool Execution Retry**: Exponential backoff with timeouts
- **Dependency Resolution**: Handles circular dependencies
- **Schema Validation**: Zod validation for all inputs/outputs

## 📚 Examples

See the `examples/` directory for:

- `promptUtilsExamples.ts`: Comprehensive prompt utility examples
- `addingNewTools.ts`: Step-by-step guide for adding new tools

## 🔄 Migration Guide

If you're migrating from a hardcoded system:

1. **Create Tool Registry**: Move tool imports to `utils/toolRegistry.ts`
2. **Update Prompts**: Replace hardcoded templates with `generatePlannerPrompt()`
3. **Update Orchestrator**: Use `TOOL_REGISTRY` instead of individual imports
4. **Add Validation**: Use `validateToolRegistry()` in your tests
5. **Test Everything**: Ensure all tools work with the new system

## 🎉 Result

You now have a maintainable, scalable system where:

- Adding a new tool requires updating only 2 places
- Prompts automatically adapt to tool changes
- No hardcoded tool names anywhere
- Built-in validation prevents errors
- Easy to test and debug

This architecture scales from 4 tools to 400+ tools without any additional complexity!
