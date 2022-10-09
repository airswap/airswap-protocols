import { FiltersResponse } from './filter/FiltersResponse'
import { Pagination } from './Pagination'
import { IndexedOrderResponse } from './IndexedOrderResponse'

export class OrderResponse {
  public orders: Record<string, IndexedOrderResponse>
  public pagination: Pagination
  public filters: FiltersResponse | undefined
  public ordersForQuery: number

  public constructor(
    orders: Record<string, IndexedOrderResponse>,
    pagination: Pagination,
    ordersForQuery: number,
    filters?: FiltersResponse
  ) {
    this.orders = orders
    this.pagination = pagination
    this.filters = filters
    this.ordersForQuery = ordersForQuery
  }
}
