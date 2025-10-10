# Travel Planner Fixes

## Issues Identified and Fixed

### 1. **Missing Step ID Validation Error**

**Problem**: The LLM was generating plans with steps that had undefined or missing `id` fields, causing Zod schema validation to fail.

**Error**: `"Invalid input: expected string, received undefined"` for step `id` field.

**Solution**:

- ✅ Enhanced prompt to explicitly require `id` fields for all steps
- ✅ Added detailed validation rules emphasizing required fields
- ✅ Added pre-execution plan validation to catch missing IDs early
- ✅ Improved error messages to include raw planner output for debugging

### 2. **Tool Argument Validation Errors**

**Problem**: The LLM was generating incorrect tool arguments that didn't match the actual tool schemas.

**Examples of errors**:

- HotelSearch: LLM passed `"dates": "2023-10-01 to 2023-10-07"` but tool expects separate `checkin` and `checkout` fields
- ItineraryFormatter: LLM passed dependency objects instead of actual values

**Solution**:

- ✅ Updated `TOOL_DEFINITIONS` with correct example arguments that match actual schemas
- ✅ Improved prompt generation to include detailed tool descriptions and example args
- ✅ Added specific guidance for ItineraryFormatter to pass actual values, not dependency references

### 3. **Error Handling Issues**

**Problem**: The system was returning a final itinerary even when tool execution failed.

**Solution**:

- ✅ Added error detection before generating final itinerary
- ✅ Only generate final itinerary if no tools failed
- ✅ Return clear error message when tools fail: "Cannot generate itinerary due to tool execution errors"

### 4. **Prompt Generation Improvements**

**Problem**: The prompt wasn't providing enough guidance for correct tool usage.

**Solution**:

- ✅ Enhanced `generateToolRules()` to include detailed tool descriptions and example arguments
- ✅ Added specific warning about ItineraryFormatter argument format
- ✅ Improved realistic example generation to include all tools in proper sequence

## Code Changes Made

### 1. `utils/dynamicPromptGenerator.ts`

```typescript
// Enhanced JSON schema with required fields explanation
function generateJsonSchemaExample(): string {
  return `{
  "city": "<optional city name>",
  "steps": [
    {
      "id": "s1",
      "tool": "${getToolNamesUnion()}",
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

// Enhanced tool rules with critical field requirements
function generateToolRules(): string[] {
  const rules = [
    // ... existing rules
    'CRITICAL: Every step MUST have an "id" field (string) - this is required for execution.',
    'CRITICAL: Every step MUST have a "tool" field with exact tool name.',
    'CRITICAL: Every step MUST have an "args" field with tool-specific arguments.',
    'Step IDs should be unique strings like "s1", "s2", "s3", etc.',
  ]
  // ... rest of function
}
```

### 2. `orchestrator/travelOrchestrator.ts`

```typescript
// Enhanced error handling with raw output
try {
  const parsed = JSON.parse(plannerText)
  plan = PlanSchema.parse(parsed)
} catch (err) {
  let errorMessage = 'Planner output invalid JSON / schema: '
  if (err instanceof Error) {
    errorMessage += err.message
  } else {
    errorMessage += String(err)
  }

  // Add the raw planner text for debugging
  errorMessage += '\n\nRaw planner output:\n' + plannerText

  throw new Error(errorMessage)
}

// Added pre-execution plan validation
const validationErrors: string[] = []

// Check for duplicate step IDs
const stepIds = plan.steps.map((s) => s.id)
const uniqueStepIds = new Set(stepIds)
if (stepIds.length !== uniqueStepIds.size) {
  validationErrors.push('Duplicate step IDs found')
}

// Check for missing step IDs
const missingIds = plan.steps.filter((s) => !s.id || s.id.trim() === '')
if (missingIds.length > 0) {
  validationErrors.push(`Steps with missing IDs found: ${missingIds.length} steps`)
}

// Check for invalid tool names
const invalidTools = plan.steps.filter((s) => !TOOL_REGISTRY[s.tool])
if (invalidTools.length > 0) {
  validationErrors.push(`Invalid tool names found: ${invalidTools.map((s) => s.tool).join(', ')}`)
}

if (validationErrors.length > 0) {
  throw new Error('Plan validation failed: ' + validationErrors.join(', '))
}
```

### 3. `utils/toolRegistry.ts`

```typescript
// Fixed ItineraryFormatter example args
{
  name: 'ItineraryFormatter',
  description: 'Format a multi-day itinerary from collated tool outputs.',
  exampleArgs: {
    city: 'Kyoto',
    attractions: ['Fushimi Inari Shrine', 'Kiyomizu-dera'],
    weather: 'Sunny, 22°C',
    hotels: [{ name: 'Kyoto Grand Plaza', rating: 4.6 }],
    totalDays: 2
  },
  exampleUsage: 'Create a formatted day-by-day travel itinerary',
}
```

### 2. `utils/dynamicPromptGenerator.ts`

```typescript
// Enhanced tool rules with detailed guidance
function generateToolRules(): string[] {
  const rules = [
    // ... existing rules
    'IMPORTANT: For ItineraryFormatter, pass actual values in args, not dependency references.',
  ]

  // Add tool-specific guidance with example args
  const toolGuidance = TOOL_DEFINITIONS.map((tool) => {
    const exampleArgs = JSON.stringify(tool.exampleArgs, null, 2)
    return `- ${tool.name}: ${tool.description}\n  Example args: ${exampleArgs}`
  }).join('\n\n')

  // ... rest of function
}
```

### 3. `orchestrator/travelOrchestrator.ts`

```typescript
// Added error detection before final itinerary generation
const hasErrors = Array.from(results.values()).some((result) => result && result.error)

let finalItinerary: any = null

if (!hasErrors) {
  // Only generate final itinerary if no tools failed
  // ... itinerary generation logic
} else {
  // If there are errors, don't generate final itinerary
  finalItinerary = {
    error: 'Cannot generate itinerary due to tool execution errors. Please check the tool results for details.',
    hasErrors: true,
  }
}
```

## Expected Behavior After Fixes

### ✅ **Successful Execution**

When all tools execute successfully:

- All tools return valid results
- Final itinerary is generated
- No error messages in final output

### ❌ **Error Handling**

When any tool fails:

- Tool results show specific error messages
- Final itinerary shows error message instead of attempting to format
- Clear indication that execution failed

### 🔧 **Tool Arguments**

- HotelSearch receives proper `checkin` and `checkout` fields
- ItineraryFormatter receives actual values, not dependency references
- All tools receive arguments that match their schemas

## Testing

Run the test script to verify fixes:

```bash
npx ts-node src/stage3-agents/agent-tools/travel-planner-coordination/test-fixes.ts
```

The test will:

1. Validate tool registry
2. Test prompt generation
3. Run a sample travel planning request
4. Report any remaining issues

## Benefits

1. **Robust Error Handling**: System gracefully handles tool failures
2. **Better LLM Guidance**: More detailed prompts lead to correct tool usage
3. **Schema Compliance**: All tool arguments match expected schemas
4. **Clear Error Messages**: Users understand what went wrong
5. **Maintainable**: Dynamic system still works with tool registry pattern
