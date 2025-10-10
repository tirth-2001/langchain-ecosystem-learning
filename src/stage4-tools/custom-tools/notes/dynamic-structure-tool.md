## 🔹 Theory Recap (for `DynamicStructuredTool`)

- A `DynamicStructuredTool` is basically a **tool with an enforced schema** (via `zod`).
- The schema defines the **keys + value types** of the arguments.
- LangChain then passes this schema to the LLM (or simulates it), so the LLM must generate arguments **matching it exactly**.
- This avoids the `"input": "toC: 77"` ambiguity we saw earlier.

---

## 🔹 Example: Weather Tool

```ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

// A fake weather fetcher for demo
const weatherTool = new DynamicStructuredTool({
  name: 'get_weather',
  description: 'Get the weather forecast for a specific city and day',
  schema: z.object({
    city: z.string().describe('The name of the city to check weather for'),
    date: z.string().describe('The date in YYYY-MM-DD format'),
    unit: z.enum(['C', 'F']).describe('The unit for temperature output'),
  }),
  func: async ({ city, date, unit }) => {
    // Dummy weather data (replace with API call in real project)
    const forecast = {
      tempC: 25,
      tempF: 77,
      condition: 'Sunny',
    }

    const temp = unit === 'C' ? `${forecast.tempC}°C` : `${forecast.tempF}°F`
    return `Weather in ${city} on ${date}: ${forecast.condition}, ${temp}`
  },
})

// Example usage
;(async () => {
  const args = {
    city: 'Paris',
    date: '2025-10-07',
    unit: 'C',
  }

  const result = await weatherTool.invoke(args)
  console.log('Tool Output:', result)
})()
```

---

## 🔹 What Happens Internally?

When you hook this into an **Agent**, the logs will now show:

```json
"tool_calls": [
  {
    "name": "get_weather",
    "args": {
      "city": "Paris",
      "date": "2025-10-07",
      "unit": "C"
    }
  }
]
```

Notice the difference:

- Instead of `"input": "Paris tomorrow in C"`,
- The schema **forces structured arguments**: `{ city, date, unit }`.

---

✅ With this, you see clearly:

- The **schema you define controls the args format**
- The LLM can’t invent weird strings anymore
- Works the same across OpenAI / Anthropic / Mistral (though OpenAI is strictest because of native function calling)
