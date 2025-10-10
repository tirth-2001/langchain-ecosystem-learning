# Travel Planner — Tool Coordination Patterns (Theory + Project Plan)

## Goals (what this example demonstrates)

- How an LLM **planner** can output a typed plan (JSON) describing which tools to call and in what logical order.
- How an **executor** (orchestrator) validates that plan, executes independent steps in **parallel**, executes dependent steps in **sequence**, and aggregates results.
- Use **typed tools** (DynamicStructuredTool + Zod) so inputs/outputs are validated and composable.
- Use an **in-memory session store** (Map) to keep per-session context (stateless pattern: load → execute → save minimal state).
- Demonstrate error handling, retries, and timeouts at the executor/tool level.

---

## Key Concepts / Theory (concise)

### 1) Planner vs Executor separation

- **Planner (LLM)**: Responsible for reasoning and producing a _typed plan_ — a JSON structure listing steps (`id`, `tool`, `args`, `dependsOn`, `parallelGroup`).
- **Executor**: Responsible for validating the plan, executing steps safely, handling concurrency, retries, timeouts, collecting results, and final aggregation.

Why split? LLMs are excellent at planning but should not be trusted to perform execution/IO directly — the executor enforces safe execution and schema checks.

---

### 2) Typed plans and Zod validation

- Planner must return _only JSON_ in a strict shape. Use Zod server-side to validate both:

  - The plan shape (array of steps).
  - Each tool's `args` shape (tool-specific Zod schemas).

- If parse fails, re-prompt planner (or reject and log).

Example plan shape:

```json
{
  "city": "Kyoto",
  "steps": [
    { "id": "s1", "tool": "AttractionSearch", "args": { "city": "Kyoto", "limit": 5 } },
    { "id": "s2", "tool": "WeatherLookup", "args": { "city": "Kyoto" }, "dependsOn": ["s1"] },
    {
      "id": "s3",
      "tool": "ItineraryFormatter",
      "args": { "city": "Kyoto", "attractions": [] },
      "dependsOn": ["s1", "s2"]
    }
  ]
}
```

---

### 3) DynamicStructuredTool (typed tools)

- Implement each tool as `DynamicStructuredTool` (LangChain 0.3.x), exposing:

  - `name`, `description`, `schema` (zod), and `func` (implementation).

- Benefits:

  - Tool input is validated before execution.
  - Tool outputs are standardized (JSON strings parsed by executor).
  - Safer composition: executor can pass typed outputs between steps.

Example tool snippet (AttractionSearch):

```ts
export const AttractionSearch = new DynamicStructuredTool({
  name: 'AttractionSearch',
  description: 'Return top attractions for a city.',
  schema: z.object({ city: z.string(), limit: z.number().optional() }),
  func: async (input) => {
    const { city, limit = 5 } = z.object({ city: z.string(), limit: z.number().optional() }).parse(input)
    const results = [
      /* simulated list */
    ].slice(0, limit)
    return JSON.stringify({ city, results })
  },
})
```

---

### 4) Execution semantics: parallel & dependent

- Executor identifies steps whose `dependsOn` are satisfied; those are `ready`.
- All `ready` steps can be executed in **parallel** (via `Promise.all`) — good for independent tasks like `HotelSearch` and `FlightSearch`.
- Steps that **depend** on results from previous steps wait for the dependency results and are executed after those complete.
- To group parallelism more intentionally, planner may add `parallelGroup` labels; executor can use that to further refine concurrency rules.

Pseudo algorithm:

1. Parse plan → `pending = set(all steps)`, `results = {}`.
2. Loop: find `ready = steps with deps satisfied`.
3. Execute all `ready` steps concurrently.
4. Store outputs in `results`; remove steps from `pending`.
5. Repeat until `pending` empty or error.

Add timeouts and retries on each step execution (safe defaults: 2 retries, exponential backoff, per-step timeout).

---

### 5) Error handling & fallback strategies

- Per-step errors should be captured and returned as part of `toolResults`. Options for executor:

  - **Fail-fast**: stop execution on first critical error.
  - **Best-effort**: continue other independent steps; annotate errors in results.

- Fallbacks:

  - If `AttractionSearch` fails, try a retry policy; if persistent, planner could be re-invoked to propose alternative steps.
  - Use simple rules to decide whether a failed step is blocking for the final answer.

---

### 6) Stateless multi-user pattern (in-memory for demo)

- **Do not** use a global singleton for user data; use _per-session_ contexts keyed by `sessionId`.
- For this demo we will use an in-memory `Map<string, SessionData>` (sufficient for development and single-process testing).
- Pattern:

  ```ts
  const sessions = new Map<string, any>()
  await withSession(sessionId, async (session) => {
    // session.context is available; mutate and save automatically
  })
  ```

In production, replace with Redis/DB.

---

### 7) Aggregation and final formatting

- If the planner includes a formatting step (e.g., `ItineraryFormatter`), prefer that tool's result as the final canonical output.
- Otherwise, aggregator collates partial results (attractions+weather+hotels) and calls `ItineraryFormatter` with combined typed object.

---

## Project plan & file structure

```
travel-planner-coordination/
│
├── package.json
├── tsconfig.json
├── README.md
│
├── src/
│   ├── index.ts                       # simple CLI/demo entry that calls orchestrator
│   ├── orchestrator/
│   │   └── travelOrchestrator.ts      # planner + plan-parse + executor (main logic)
│   │
│   ├── tools/
│   │   ├── attractionSearch.ts        # DynamicStructuredTool
│   │   ├── weatherLookup.ts
│   │   ├── hotelSearch.ts
│   │   └── itineraryFormatter.ts
│   │
│   ├── prompts/
│   │   └── plannerPrompt.ts           # planner prompt template & examples
│   │
│   └── utils/
│       ├── sessionStore.ts            # per-session in-memory store (Map)
│       ├── retry.ts                   # retry + timeout helpers
│       └── zodSchemas.ts              # shared Zod schemas (PlanStep, Plan)
│
└── scripts/
    └── run-demo.ts                    # convenience script to run example plan
```

---

## Implementation checklist (ordered)

1. Create Zod schemas: `PlanStepSchema`, `PlanSchema`.
2. Implement typed tools under `src/tools/*` (use `DynamicStructuredTool`).
3. Build planner prompt in `src/prompts/plannerPrompt.ts` (explicit "output JSON only" instructions and small example).
4. Implement `sessionStore` (in-memory Map).
5. Implement `retry` utility with timeout wrapper.
6. Implement `travelOrchestrator.ts`:

   - plan request → parse/validate → execute steps with parallelization & dependency handling → aggregate → return.

7. Create `scripts/run-demo.ts` to run a sample user input and print formatted output.
8. Add tests & logging to validate behavior (happy/failure paths).
9. Tune planner prompt and iterate on plan->execute loop.

---

## Minimal code snippets (executor patterns)

**Plan Zod schemas (src/utils/zodSchemas.ts):**

```ts
import { z } from 'zod'

export const PlanStepSchema = z.object({
  id: z.string(),
  tool: z.string(), // consider z.enum for allowed tools
  args: z.record(z.any()),
  dependsOn: z.array(z.string()).optional(),
  parallelGroup: z.string().optional(),
})

export const PlanSchema = z.object({
  city: z.string().optional(),
  steps: z.array(PlanStepSchema),
})
```

**Planner prompt (src/prompts/plannerPrompt.ts) — excerpt:**

```txt
You are a travel planner. Given the user input, output ONLY valid JSON that follows this shape:
{ "city": "...", "steps":[ { "id":"s1","tool":"AttractionSearch","args":{...}, "dependsOn":[...]} ] }
Allowed tools: AttractionSearch, WeatherLookup, HotelSearch, ItineraryFormatter
Example output: { "city":"Kyoto", "steps":[ ... ] }
No extra commentary. Only JSON.
```

**Core executor pattern (pseudocode / TypeScript outline):**

```ts
// 1. parse & validate plan using PlanSchema
const plan = PlanSchema.parse(JSON.parse(plannerText))

// 2. prepare registry
const TOOL_REGISTRY = { AttractionSearch, WeatherLookup, HotelSearch, ItineraryFormatter }

// 3. pending map + results
const pending = new Map(plan.steps.map((s) => [s.id, s]))
const results = new Map()

while (pending.size > 0) {
  const ready = []
  for (const step of pending.values()) {
    const deps = step.dependsOn ?? []
    if (deps.every((d) => results.has(d))) ready.push(step)
  }
  if (ready.length === 0) throw new Error('circular or missing deps')
  // execute ready steps in parallel
  const execs = ready.map((step) => executeStepWithValidationAndRetry(step))
  const settled = await Promise.all(execs)
  for (const r of settled) {
    results.set(r.id, r.output)
    pending.delete(r.id)
  }
}
// 4. aggregation (prefer ItineraryFormatter if present)
```

**executeStepWithValidationAndRetry (core idea):**

```ts
async function executeStep(step) {
  const tool = TOOL_REGISTRY[step.tool]
  tool.schema.parse(step.args) // validate
  // wrap call with timeout & retry
  const raw = await retryWithTimeout(() => tool.call(step.args), (retries = 2), (timeoutMs = 8000))
  try {
    return JSON.parse(String(raw))
  } catch {
    return raw
  }
}
```

---

## Output shape returned to caller

```ts
{
  plan: <validated plan>,
  executedOrder: ['s1','s2', ...],
  toolResults: { s1: {...}, s2: {...}, s3: { error: '...' } },
  itinerary: {...} // final formatted itinerary (object or string)
}
```

---

## Recommended minimal demo scenario (user input)

- "Plan a 2-day Kyoto trip: include main attractions, check the weather, and find hotels for 2 nights."

  - Planner should propose: `WeatherLookup` and `AttractionSearch` in parallel, then `HotelSearch` and finally `ItineraryFormatter` depending on those.
