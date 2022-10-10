import { FullOrder } from '@airswap/typescript'
import axios from 'axios'

export type IndexedOrderResponse = {
  hash?: string | undefined
  order: FullOrder
  addedOn: number
}

export type HealthCheckResponse = {
  peers: string[]
  registry: string
  databaseOrders: number
}

export type OrderResponse = {
  orders: Record<string, IndexedOrderResponse>
  pagination: Pagination
  filters?: FiltersResponse | undefined
  ordersForQuery: number
}

export type Pagination = {
  first: string
  last: string
  prev?: string | undefined
  next?: string | undefined
}

export function toSortOrder(key: string): SortOrder | undefined {
  if (typeof key !== 'string') {
    return undefined
  }
  if (key.toUpperCase() === SortOrder.ASC) {
    return SortOrder.ASC
  }
  if (key.toUpperCase() === SortOrder.DESC) {
    return SortOrder.DESC
  }

  return undefined
}

export type RequestFilter = {
  signerTokens?: string[]
  senderTokens?: string[]
  minSignerAmount?: bigint
  maxSignerAmount?: bigint
  minSenderAmount?: bigint
  maxSenderAmount?: bigint
  page: number
  sortField?: SortField
  sortOrder?: SortOrder
  maxAddedDate?: number
}

export type FiltersResponse = {
  signerToken: Record<string, AmountLimitFilterResponse>
  senderToken: Record<string, AmountLimitFilterResponse>
}

export type AmountLimitFilterResponse = {
  min: string
  max: string
}

export enum SortField {
  SIGNER_AMOUNT = 'SIGNER_AMOUNT',
  SENDER_AMOUNT = 'SENDER_AMOUNT',
}

export function toSortField(key: string): SortField | undefined {
  if (typeof key !== 'string') {
    return undefined
  }
  if (key.toUpperCase() === SortField.SIGNER_AMOUNT) {
    return SortField.SIGNER_AMOUNT
  }
  if (key.toUpperCase() === SortField.SENDER_AMOUNT) {
    return SortField.SENDER_AMOUNT
  }
  return undefined
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export async function getOrdersBy(
  host: string,
  requestFilter: RequestFilter,
  filters = false
) {
  return await axios.post(host, {
    jsonrpc: '2.0',
    id: '1',
    method: 'getOrders',
    params: [{ ...requestFilter, filters }],
  })
}

export async function getOrders(host: string) {
  return await axios.post(host, {
    jsonrpc: '2.0',
    id: '1',
    method: 'getOrders',
    params: [{}],
  })
}

export async function addOrder(host: string, fullOrder: FullOrder) {
  return await axios.post(host, {
    jsonrpc: '2.0',
    id: '1',
    method: 'addOrder',
    params: [fullOrder],
  })
}

export async function getHealthCheck(host: string) {
  return await axios.get(host)
}
