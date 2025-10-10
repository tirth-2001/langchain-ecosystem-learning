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
          return `✅ Order placed successfully at ${order.restaurant}. ETA: ${order.eta}. Bill amount : ${order.total}`
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
