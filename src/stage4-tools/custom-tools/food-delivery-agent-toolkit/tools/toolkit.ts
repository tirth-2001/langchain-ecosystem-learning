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
