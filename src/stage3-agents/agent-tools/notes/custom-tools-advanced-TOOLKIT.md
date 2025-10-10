## 🍕 Project: “Food Delivery Toolkit (Advanced Example)”

### 🎯 Goal

The AI Agent can:

1. Search for restaurants (via external API).
2. Fetch menu for a selected restaurant.
3. Calculate delivery cost and ETA.
4. Place an order and confirm it.
5. Handle errors, retries, and context between tools.

---

## 🗂 Folder Structure

```
food-delivery-agent-toolkit/
│
├── index.ts
│
├── tools/
│   ├── restaurantSearchTool.ts
│   ├── menuFetchTool.ts
│   ├── orderCalculatorTool.ts
│   ├── placeOrderTool.ts
│   ├── toolkit.ts
│
├── utils/
│   ├── retryWrapper.ts
│   ├── contextStore.ts
│
├── data/
│   ├── mockRestaurants.json
│   ├── mockMenus.json
│
└── .env (no need to create new. Use existing)
```

---

## 🔧 1. **The Core Idea**

You’ll simulate an ecosystem like **Swiggy / DoorDash / Zomato**, but locally — so no actual API keys are needed.
We’ll design it **as if** it were external, using `fetch()` patterns and fallback layers.
All tools communicate via a shared `contextStore`, mimicking how memory is persisted across tool invocations.

---

## 🧩 2. `contextStore.ts` — Shared Context Manager

Used to persist state between tool invocations.

```ts
// utils/contextStore.ts
interface Context {
  restaurant?: string
  menu?: string[]
  order?: any
}

let store: Context = {}

export const contextStore = {
  get: () => store,
  set: (updates: Partial<Context>) => {
    store = { ...store, ...updates }
  },
  clear: () => {
    store = {}
  },
}
```

---

## 🧩 3. `retryWrapper.ts` — Retry Mechanism with Backoff

For APIs that may fail or timeout.

```ts
// utils/retryWrapper.ts
export async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise((res) => setTimeout(res, delay * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}
```

---

## 🍴 4. `restaurantSearchTool.ts` — External API Simulation

Simulates searching a restaurant API and caches context.

```ts
import { Tool } from '@langchain/core/tools'
import { retry } from '../utils/retryWrapper'
import { contextStore } from '../utils/contextStore'
import fs from 'fs'
import path from 'path'

export class RestaurantSearchTool extends Tool {
  name = 'restaurant_search_tool'
  description = 'Searches available restaurants matching cuisine or name'

  async _call(input: string): Promise<string> {
    try {
      return await retry(async () => {
        const dataPath = path.join(__dirname, '../data/mockRestaurants.json')
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
        const match = data.find((r: any) => r.name.toLowerCase().includes(input.toLowerCase()))
        if (!match) throw new Error(`No restaurant found for '${input}'`)

        contextStore.set({ restaurant: match.name })
        return `Found restaurant: ${match.name}, located at ${match.location}`
      })
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  }
}
```

---

## 🥗 5. `menuFetchTool.ts` — Fetch Menu + Context Dependency

Fetches menu for the restaurant stored in context.

```ts
import { Tool } from '@langchain/core/tools'
import { contextStore } from '../utils/contextStore'
import fs from 'fs'
import path from 'path'

export class MenuFetchTool extends Tool {
  name = 'menu_fetch_tool'
  description = 'Fetches menu items for the current restaurant in context'

  async _call(): Promise<string> {
    try {
      const { restaurant } = contextStore.get()
      if (!restaurant) throw new Error('No restaurant in context!')

      const dataPath = path.join(__dirname, '../data/mockMenus.json')
      const menus = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

      const menu = menus[restaurant]
      if (!menu) throw new Error(`No menu found for ${restaurant}`)

      contextStore.set({ menu })
      return `Menu for ${restaurant}: ${menu.join(', ')}`
    } catch (err: any) {
      return `Error fetching menu: ${err.message}`
    }
  }
}
```

---

## 🍟 6. `orderCalculatorTool.ts` — Parallel and Dependent Logic

Takes a list of selected dishes (human or model-chosen) and calculates total, tax, delivery fee, and ETA.

```ts
import { Tool } from '@langchain/core/tools'
import { contextStore } from '../utils/contextStore'

export class OrderCalculatorTool extends Tool {
  name = 'order_calculator_tool'
  description = 'Calculates total price, tax, and delivery ETA for selected dishes'

  async _call(input: string): Promise<string> {
    try {
      const { restaurant, menu } = contextStore.get()
      if (!restaurant || !menu) throw new Error('Missing context: fetch restaurant and menu first')

      const requestedItems = input.split(',').map((i) => i.trim())
      const prices = requestedItems.map(() => Math.floor(Math.random() * 400) + 100)
      const total = prices.reduce((a, b) => a + b, 0)
      const tax = Math.round(total * 0.05)
      const delivery = 40
      const eta = `${Math.floor(Math.random() * 20) + 15} mins`

      const order = { restaurant, items: requestedItems, total, tax, delivery, eta }
      contextStore.set({ order })

      return `Order summary for ${restaurant}:\nItems: ${requestedItems.join(', ')}\nTotal: ₹${
        total + tax + delivery
      }\nETA: ${eta}`
    } catch (err: any) {
      return `Error calculating order: ${err.message}`
    }
  }
}
```

---

## 🍱 7. `placeOrderTool.ts` — Final Step with Fallback

Places the order; includes simulated failure and retry.

```ts
import { Tool } from '@langchain/core/tools'
import { retry } from '../utils/retryWrapper'
import { contextStore } from '../utils/contextStore'

export class PlaceOrderTool extends Tool {
  name = 'place_order_tool'
  description = 'Places the final order for the calculated cart'

  async _call(): Promise<string> {
    try {
      const { order } = contextStore.get()
      if (!order) throw new Error('Order details not available in context')

      const result = await retry(
        async () => {
          if (Math.random() < 0.3) throw new Error('Network timeout during order placement')
          return `✅ Order placed successfully at ${order.restaurant}. ETA: ${order.eta}`
        },
        2,
        1500,
      )

      return result
    } catch (err: any) {
      return `Order placement failed: ${err.message}`
    }
  }
}
```

---

## 🍔 8. `toolkit.ts` — Toolkit Export

```ts
import { RestaurantSearchTool } from './restaurantSearchTool'
import { MenuFetchTool } from './menuFetchTool'
import { OrderCalculatorTool } from './orderCalculatorTool'
import { PlaceOrderTool } from './placeOrderTool'

export const FoodDeliveryToolkit = [
  new RestaurantSearchTool(),
  new MenuFetchTool(),
  new OrderCalculatorTool(),
  new PlaceOrderTool(),
]
```

---

## 🧠 9. `index.ts` — Agent Orchestration

```ts
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { FoodDeliveryToolkit } from './tools/toolkit'
import { contextStore } from './utils/contextStore'

const model = new ChatOpenAI({
  modelName: 'gpt-4.1-mini',
  temperature: 0.2,
})

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a Food Delivery Assistant who can search, fetch menus, calculate bills, and place orders.'],
  ['human', '{input}'],
  new MessagesPlaceholder('agent_scratchpad'),
])

async function run() {
  contextStore.clear()

  const agent = await createToolCallingAgent({
    llm: model,
    tools: FoodDeliveryToolkit,
    prompt,
  })

  const executor = new AgentExecutor({
    agent,
    tools: FoodDeliveryToolkit,
    verbose: true,
    returnIntermediateSteps: true,
  })

  const response = await executor.invoke({
    input: "Find Domino's restaurant, fetch its menu, order Veg Pizza and Coke, and place the order.",
  })

  console.log('Final Response:\n', response.output)
}

run().catch(console.error)
```

---

## 🥘 10. Example Mock Data

### `mockRestaurants.json`

```json
[
  { "name": "Domino's", "location": "Downtown" },
  { "name": "Subway", "location": "City Mall" },
  { "name": "Biryani Express", "location": "Tech Park" }
]
```

### `mockMenus.json`

```json
{
  "Domino's": ["Veg Pizza", "Cheese Burst", "Coke", "Garlic Bread"],
  "Subway": ["Veg Sub", "Chicken Sub", "Salad", "Cookies"],
  "Biryani Express": ["Chicken Biryani", "Paneer Biryani", "Raita", "Gulab Jamun"]
}
```

---

## 🔁 11. Execution Flow Diagram

```
User → Agent →
 1️⃣ RestaurantSearchTool (API lookup)
 2️⃣ MenuFetchTool (context-dependent)
 3️⃣ OrderCalculatorTool (dependent + price logic)
 4️⃣ PlaceOrderTool (retry fallback)
→ Final Response
```

---

## 💎 Key Learnings in This Example

| Concept                            | Description                                            |
| ---------------------------------- | ------------------------------------------------------ |
| **External API pattern**           | Simulated fetch using file read and `retry()`          |
| **Context persistence**            | Shared `contextStore` keeps state between tools        |
| **Error handling & fallback**      | Automatic retry with exponential backoff               |
| **Parallel & dependent execution** | Tools can execute sequentially or reuse cached data    |
| **Toolkit modularization**         | Scalable architecture for multiple domains             |
| **Agent as orchestrator**          | LLM plans the flow dynamically — you don’t hardcode it |

---

## 🔮 Extension Ideas

- Add a **Delivery ETA Tool** that queries Google Maps API.
- Include a **Customer Feedback Tool** that saves comments.
- Integrate a **Payment Gateway Tool** with mock success/failure.
- Introduce **LangChain Memory** to persist multi-session state.
