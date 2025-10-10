Great — I’ll produce the files one-by-one (as steps) following your exact folder layout and checklist. Each step contains a single file (path + full TypeScript content). Drop each file into `travel-planner-coordination/` with the same relative paths.

---

### Step 1 — `utils/zodSchemas.ts`

```ts
// utils/zodSchemas.ts
import { z } from 'zod'

export const PlanStepSchema = z.object({
  id: z.string(),
  tool: z.string(),
  args: z.record(z.any()),
  dependsOn: z.array(z.string()).optional(),
  parallelGroup: z.string().optional(),
})

export const PlanSchema = z.object({
  city: z.string().optional(),
  steps: z.array(PlanStepSchema),
})

export type PlanStep = z.infer<typeof PlanStepSchema>
export type Plan = z.infer<typeof PlanSchema>
```

---

### Step 2 — `tools/attractionSearch.ts`

```ts
// tools/attractionSearch.ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * AttractionSearch
 * - input: { city: string, limit?: number }
 * - output: stringified JSON { city, attractions: string[] }
 */
export const AttractionSearch = new DynamicStructuredTool({
  name: 'AttractionSearch',
  description: 'Return top attractions for a city.',
  schema: z.object({
    city: z.string(),
    limit: z.number().optional(),
  }),
  func: async (input: unknown) => {
    const { city, limit = 5 } = z.object({ city: z.string(), limit: z.number().optional() }).parse(input)

    // Mocked data (replace with real API call in production)
    const sampleDB: Record<string, string[]> = {
      Kyoto: ['Fushimi Inari Shrine', 'Kiyomizu-dera', 'Arashiyama Bamboo Grove', 'Gion', 'Nijo Castle'],
      Paris: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Montmartre', 'Seine River Cruise'],
      Tokyo: ['Shibuya Crossing', 'Senso-ji Temple', 'Tokyo Skytree', 'Meiji Shrine', 'Asakusa'],
    }

    const attractions = sampleDB[city] ?? [`Top sights in ${city} (mocked)`]
    return JSON.stringify({ city, attractions: attractions.slice(0, limit) })
  },
})
```

---

### Step 3 — `tools/weatherLookup.ts`

```ts
// tools/weatherLookup.ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * WeatherLookup
 * - input: { city: string, date?: string }
 * - output: stringified JSON { city, date?, forecast }
 */
export const WeatherLookup = new DynamicStructuredTool({
  name: 'WeatherLookup',
  description: 'Return a short weather summary for a city (mocked).',
  schema: z.object({
    city: z.string(),
    date: z.string().optional(),
  }),
  func: async (input: unknown) => {
    const { city, date } = z.object({ city: z.string(), date: z.string().optional() }).parse(input)

    // Mocked weather - replace with a real weather API in production
    const forecasts: Record<string, string> = {
      Kyoto: 'Sunny, 22°C / 14°C',
      Paris: 'Light rain, 16°C / 9°C',
      Tokyo: 'Cloudy, 25°C / 18°C',
    }

    const forecast = forecasts[city] ?? 'Partly cloudy, temperature unknown'
    return JSON.stringify({ city, date: date ?? null, forecast })
  },
})
```

---

### Step 4 — `tools/hotelSearch.ts`

```ts
// tools/hotelSearch.ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * HotelSearch
 * - input: { city: string, checkin: string, checkout: string, maxResults?: number }
 * - output: stringified JSON { city, hotels: [{name, rating}] }
 */
export const HotelSearch = new DynamicStructuredTool({
  name: 'HotelSearch',
  description: 'Return a short list of hotels for the city and dates.',
  schema: z.object({
    city: z.string(),
    checkin: z.string(),
    checkout: z.string(),
    maxResults: z.number().optional(),
  }),
  func: async (input: unknown) => {
    const {
      city,
      checkin,
      checkout,
      maxResults = 3,
    } = z
      .object({
        city: z.string(),
        checkin: z.string(),
        checkout: z.string(),
        maxResults: z.number().optional(),
      })
      .parse(input)

    // Mocked hotels - replace with real booking API call (Hotels/OTA) in prod.
    const sampleHotels = [
      { name: `${city} Grand Plaza`, rating: 4.6 },
      { name: `${city} Central Inn`, rating: 4.2 },
      { name: `${city} Cozy Stay`, rating: 4.0 },
      { name: `${city} Budget Lodge`, rating: 3.7 },
    ]

    return JSON.stringify({ city, checkin, checkout, hotels: sampleHotels.slice(0, maxResults) })
  },
})
```

---

### Step 5 — `tools/itineraryFormatter.ts`

```ts
// tools/itineraryFormatter.ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * ItineraryFormatter
 * - input: { city, attractions: string[], weather: string, hotels?: any, totalDays?: number }
 * - output: stringified JSON object with a day-wise itinerary
 */
export const ItineraryFormatter = new DynamicStructuredTool({
  name: 'ItineraryFormatter',
  description: 'Format a multi-day itinerary from collated tool outputs.',
  schema: z.object({
    city: z.string(),
    attractions: z.array(z.string()),
    weather: z.string(),
    hotels: z.any().optional(),
    totalDays: z.number().optional(),
  }),
  func: async (input: unknown) => {
    const {
      city,
      attractions,
      weather,
      hotels = [],
      totalDays = 2,
    } = z
      .object({
        city: z.string(),
        attractions: z.array(z.string()),
        weather: z.string(),
        hotels: z.any().optional(),
        totalDays: z.number().optional(),
      })
      .parse(input)

    // Build a very simple itinerary: take first `totalDays` attractions (or rotate)
    const days = []
    for (let d = 0; d < totalDays; d++) {
      const place = attractions[d] ?? attractions[d % attractions.length] ?? 'Explore local area'
      days.push({ day: d + 1, plan: `Morning: Visit ${place}. Afternoon: Local food / walking. Note: ${weather}` })
    }

    const itinerary = { city, hotels, weather, days }
    return JSON.stringify(itinerary, null, 2)
  },
})
```

---

### Step 6 — `prompts/plannerPrompt.ts`

```ts
// prompts/plannerPrompt.ts
import { ChatPromptTemplate } from '@langchain/core/prompts'

/**
 * Planner prompt:
 * Instructs the LLM planner to output only valid JSON following the PlanSchema.
 * Tools allowed: AttractionSearch, WeatherLookup, HotelSearch, ItineraryFormatter
 *
 * The orchestrator will validate with zod and reject invalid outputs.
 */
export const plannerPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a travel-planning assistant. Your job is to output a STRICT JSON plan describing which tools to run and in what order.',
  ],
  [
    'human',
    `User request: {input}

Please output ONLY valid JSON that matches this shape:

{
  "city": "<optional city name>",
  "steps": [
    {
      "id": "s1",
      "tool": "AttractionSearch" | "WeatherLookup" | "HotelSearch" | "ItineraryFormatter",
      "args": { /* tool-specific args */ },
      "dependsOn": ["s0"] /* optional - step ids to wait for */,
      "parallelGroup": "groupA" /* optional label for parallel grouping */
    }
  ]
}

Rules:
- Output only the JSON object (no commentary, no code fencing).
- Use the exact tool names: AttractionSearch, WeatherLookup, HotelSearch, ItineraryFormatter.
- Provide minimal valid args for each tool (e.g., city, dates) so the orchestrator can run them.
- Make dependencies explicit (use dependsOn when a step needs predecessor results).
- Keep the plan deterministic and simple.

EXAMPLE:
{
  "city": "Kyoto",
  "steps": [
    { "id": "s1", "tool": "WeatherLookup", "args": { "city": "Kyoto", "date": "2025-11-10" } },
    { "id": "s2", "tool": "AttractionSearch", "args": { "city": "Kyoto", "limit": 5 }, "dependsOn": ["s1"] },
    { "id": "s3", "tool": "ItineraryFormatter", "args": { "city": "Kyoto", "attractions": [], "weather": "" }, "dependsOn": ["s1","s2"] }
  ]
}
`,
  ],
])
```

---

### Step 7 — `utils/sessionStore.ts`

```ts
// utils/sessionStore.ts
// Lightweight session store (in-memory Map).
// Pattern: load session, mutate context, save session (stateless orchestration friendly).

type SessionData = {
  context: Record<string, any>
  createdAt: number
  updatedAt: number
}

const sessions = new Map<string, SessionData>()

export const sessionStore = {
  get: (sessionId: string): SessionData | null => {
    return sessions.get(sessionId) ?? null
  },

  set: (sessionId: string, data: Partial<SessionData>) => {
    const existing = sessions.get(sessionId) ?? { context: {}, createdAt: Date.now(), updatedAt: Date.now() }
    const merged = { ...existing, ...data, updatedAt: Date.now() }
    sessions.set(sessionId, merged)
  },

  withSession: async <T>(sessionId: string, runner: (session: SessionData) => Promise<T> | T): Promise<T> => {
    const current = sessions.get(sessionId) ?? { context: {}, createdAt: Date.now(), updatedAt: Date.now() }
    const result = await runner(current)
    sessions.set(sessionId, { ...current, updatedAt: Date.now() })
    return result
  },

  // convenience helper
  getContext: (sessionId: string) => sessions.get(sessionId)?.context ?? {},
}
```

---

### Step 8 — `utils/retry.ts`

```ts
// utils/retry.ts
/**
 * retryWithBackoff: run async function with retries and per-attempt timeout.
 *
 * - fn: async function to run
 * - attempts: number of attempts (default 3)
 * - initialDelayMs: base backoff (default 300ms)
 * - timeoutMs: per-attempt timeout in ms (default 10s)
 */

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts = 3,
  initialDelayMs = 300,
  timeoutMs = 10000,
): Promise<T> {
  let attempt = 0
  let delay = initialDelayMs
  let lastError: unknown = null

  while (attempt < attempts) {
    try {
      attempt++
      return await withTimeout(fn(), timeoutMs)
    } catch (err) {
      lastError = err
      if (attempt >= attempts) break
      // exponential backoff with jitter
      const jitter = Math.floor(Math.random() * Math.min(1000, delay))
      await new Promise((res) => setTimeout(res, delay + jitter))
      delay *= 2
    }
  }
  throw lastError
}
```

---

### Step 9 — `orchestrator/travelOrchestrator.ts`

```ts
// orchestrator/travelOrchestrator.ts
import { ChatOpenAI } from '@langchain/openai'
import { plannerPrompt } from '../prompts/plannerPrompt'
import { PlanSchema, PlanStep, Plan } from '../utils/zodSchemas'
import { sessionStore } from '../utils/sessionStore'
import { retryWithBackoff } from '../utils/retry'

import { AttractionSearch } from '../tools/attractionSearch'
import { WeatherLookup } from '../tools/weatherLookup'
import { HotelSearch } from '../tools/hotelSearch'
import { ItineraryFormatter } from '../tools/itineraryFormatter'

/**
 * Travel Orchestrator
 *
 * - Calls planner LLM to get typed plan (JSON)
 * - Validates plan (zod)
 * - Executes steps with parallelization & dependency resolution
 * - Validates tool args against tool schema before calling
 * - Uses in-memory sessionStore to persist minimal state
 */

const TOOL_REGISTRY: Record<string, any> = {
  AttractionSearch,
  WeatherLookup,
  HotelSearch,
  ItineraryFormatter,
}

// Planner LLM (stronger model recommended)
const plannerLLM = new ChatOpenAI({
  modelName: process.env.PLANNER_MODEL ?? 'gpt-4.1-mini',
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
})

function safeParseJSON(s: unknown) {
  try {
    return typeof s === 'string' ? JSON.parse(s) : s
  } catch {
    return s
  }
}

export async function runTravelPlanner(sessionId: string, userInput: string) {
  // load session context (stateless: load -> mutate -> save)
  const sessionBefore = sessionStore.get(sessionId) ?? { context: {}, createdAt: Date.now(), updatedAt: Date.now() }

  // 1) Planner prompt -> LLM
  const promptValue = await plannerPrompt.format({ input: userInput })
  const plannerResp = await plannerLLM.call({ messages: promptValue.messages })
  const plannerText =
    // modern responses may have .generations... fallback to .text
    (plannerResp as any)?.generations?.[0]?.[0]?.text ?? (plannerResp as any)?.text ?? String(plannerResp)

  // 2) Parse + validate plan
  let plan: Plan
  try {
    const parsed = JSON.parse(plannerText)
    plan = PlanSchema.parse(parsed)
  } catch (err) {
    throw new Error('Planner output invalid JSON / schema: ' + String(err))
  }

  // 3) Execution: dependency resolution + parallel execution
  const stepsById = new Map(plan.steps.map((s) => [s.id, s]))
  const pending = new Map(plan.steps.map((s) => [s.id, s]))
  const results = new Map<string, any>()
  const executedOrder: string[] = []

  const maxIterations = plan.steps.length * 10
  let iterations = 0

  async function executeStep(step: PlanStep) {
    const tool = TOOL_REGISTRY[step.tool]
    if (!tool) throw new Error(`Unknown tool "${step.tool}"`)

    // Validate args against tool.schema if present (best-effort)
    if ((tool as any).schema) {
      try {
        ;(tool as any).schema.parse(step.args)
      } catch (e) {
        throw new Error(`Arg validation failed for tool ${step.tool}: ${(e as Error).message}`)
      }
    }

    // Execute with retries & timeout
    const raw = await retryWithBackoff(() => (tool as any).call(step.args), 3, 300, 10_000)
    const parsed = safeParseJSON(raw)
    return parsed
  }

  while (pending.size > 0 && iterations++ < maxIterations) {
    // find ready steps
    const ready: PlanStep[] = []
    for (const step of pending.values()) {
      const deps = step.dependsOn ?? []
      const ok = deps.every((d) => results.has(d))
      if (ok) ready.push(step)
    }

    if (ready.length === 0) {
      throw new Error('No ready steps found — circular or unsatisfied dependencies')
    }

    // Execute ready steps in parallel
    const execs = ready.map((s) =>
      executeStep(s)
        .then((r) => ({ id: s.id, ok: true, result: r }))
        .catch((err) => ({ id: s.id, ok: false, error: String(err) })),
    )

    const settled = await Promise.all(execs)

    for (const item of settled) {
      executedOrder.push(item.id)
      if (!item.ok) {
        results.set(item.id, { error: item.error })
      } else {
        results.set(item.id, item.result)
      }
      pending.delete(item.id)
    }
  }

  if (pending.size > 0) throw new Error('Execution stopped before completing all steps')

  // 4) Aggregate / final output: prefer an ItineraryFormatter step if present
  let finalItinerary: any = null
  for (const step of plan.steps) {
    if (step.tool === 'ItineraryFormatter' && results.has(step.id)) {
      finalItinerary = results.get(step.id)
      break
    }
  }

  // If not provided, collate and call ItineraryFormatter
  if (!finalItinerary) {
    const collated: any = { city: plan.city ?? null, attractions: [], weather: '', hotels: [] }
    for (const [id, res] of results.entries()) {
      try {
        // Best-effort detection
        if (res && res.attractions) collated.attractions.push(...res.attractions)
        if (res && res.forecast && !collated.weather) collated.weather = res.forecast
        if (res && res.hotels && collated.hotels.length === 0) collated.hotels = res.hotels
      } catch {
        // ignore parsing issues
      }
    }

    // call formatter
    try {
      const raw = await retryWithBackoff(
        () =>
          (ItineraryFormatter as any).call({
            city: collated.city,
            attractions: collated.attractions,
            weather: collated.weather,
            hotels: collated.hotels,
            totalDays: 2,
          }),
        2,
        300,
        8000,
      )
      finalItinerary = safeParseJSON(raw)
    } catch (err) {
      finalItinerary = { error: 'Failed to format itinerary: ' + String(err) }
    }
  }

  // 5) Save a minimal snapshot in session store
  sessionStore.set(sessionId, { context: { lastPlan: plan, executedOrder }, updatedAt: Date.now() })

  return {
    plan,
    executedOrder,
    toolResults: Object.fromEntries(Array.from(results.entries())),
    itinerary: finalItinerary,
    sessionBefore,
  }
}
```

---

### Step 10 — `index.ts` (root entry)

```ts
// index.ts
import 'dotenv/config'
import { runTravelPlanner } from './orchestrator/travelOrchestrator'

async function main() {
  const sessionId = 'demo-session-1'
  const userInput =
    'Plan a 2-day trip to Kyoto. Include main attractions and check weather for the dates 2025-11-10 to 2025-11-12. Provide a 2-day itinerary.'

  console.log('=== Travel Planner Demo ===')
  try {
    const out = await runTravelPlanner(sessionId, userInput)
    console.log('\n--- Plan (validated) ---\n', JSON.stringify(out.plan, null, 2))
    console.log('\n--- Executed Order ---\n', out.executedOrder)
    console.log('\n--- Tool Results ---\n', JSON.stringify(out.toolResults, null, 2))
    console.log('\n--- Final Itinerary ---\n', JSON.stringify(out.itinerary, null, 2))
  } catch (err) {
    console.error('Planner error:', err)
  }
}

main()
```

---

## Notes & small tips

- These files use in-memory session store (`utils/sessionStore.ts`) — suitable for dev/local testing. Replace with Redis/DB in production.
- The orchestrator expects the planner LLM to return **strict JSON only**. If the planner returns commentary, the orchestrator will reject (intend by PlanSchema.parse). You can implement a retry with re-prompting if you want (not included here to keep flow simple).
- Tool implementations are mocked — replace `func` internals with actual API calls (Tavily, Google Places, OpenWeather, hotels APIs) for a production system.
- `DynamicStructuredTool.call` usage is used for tool invocation. Depending on your installed LangChain package minor version, method names may vary (`call`, `_call`, `invoke`). If you see TypeScript errors, try `.call` or `.invoke` based on your installed version.
- If planner LLM prompts fail often, iterate prompt in `prompts/plannerPrompt.ts` and add stricter examples.
