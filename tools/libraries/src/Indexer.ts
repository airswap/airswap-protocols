import { FullOrder } from '@airswap/typescript'
import axios, { AxiosError, AxiosResponse } from 'axios'

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

export abstract class IndexedOrderError extends Error {
  public code!: number
  public constructor(message: string) {
    super(message)
  }
}
export class ErrorResponse {
  public code: number
  public message: string
  public constructor(code: number, message: string) {
    this.code = code
    this.message = message
  }
}
export class SuccessResponse {
  public message: string
  public constructor(message: string) {
    this.message = message
  }
}
export class JsonRpcResponse {
  public id: string
  public result:
    | OrderResponse
    | ErrorResponse
    | SuccessResponse
    | HealthCheckResponse
    | undefined
  private jsonrpc = '2.0'

  public constructor(
    id: string,
    result:
      | OrderResponse
      | IndexedOrderError
      | SuccessResponse
      | HealthCheckResponse
      | undefined
  ) {
    this.id = id
    if (result instanceof IndexedOrderError) {
      this.result = new ErrorResponse(result.code, result.message)
    } else {
      this.result = result
    }
  }
}

export class NodeIndexer {
  private host: string

  public constructor(hostname: string) {
    this.host = hostname
  }

  public async getOrdersBy(
    requestFilter: RequestFilter,
    filters = false
  ): Promise<OrderResponse> {
    try {
      const axiosResponse = (await axios.post(this.host, {
        jsonrpc: '2.0',
        id: '1',
        method: 'getOrders',
        params: [{ ...this.toBigIntJson(requestFilter), filters }],
      })) as AxiosResponse<JsonRpcResponse>
      const response = axiosResponse.data.result as OrderResponse
      return Promise.resolve(response)
    } catch (err) {
      const error = err as AxiosError<JsonRpcResponse>
      const response = error.response?.data?.result as IndexedOrderError
      return Promise.reject(response)
    }
  }

  public async getOrders(): Promise<OrderResponse> {
    try {
      const axiosResponse = (await axios.post(this.host, {
        jsonrpc: '2.0',
        id: '1',
        method: 'getOrders',
        params: [{}],
      })) as AxiosResponse<JsonRpcResponse>
      const response = axiosResponse.data.result as OrderResponse
      return Promise.resolve(response)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public async addOrder(fullOrder: FullOrder): Promise<SuccessResponse> {
    try {
      const axiosResponse = await axios.post(this.host, {
        jsonrpc: '2.0',
        id: '1',
        method: 'addOrder',
        params: [fullOrder],
      })
      const response = axiosResponse.data.result as SuccessResponse
      return Promise.resolve(response)
    } catch (err) {
      const error = err as AxiosError<JsonRpcResponse>
      const response = error.response?.data?.result as IndexedOrderError
      return Promise.reject(response)
    }
  }

  public async getHealthCheck(): Promise<HealthCheckResponse> {
    try {
      console.log(axios)
      console.log('getHealthCheck')
      const response = (await axios.get(
        this.host
      )) as AxiosResponse<JsonRpcResponse>
      return Promise.resolve(response.data.result as HealthCheckResponse)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  private toBigIntJson(requestFilter: RequestFilter) {
    return JSON.parse(
      JSON.stringify(requestFilter, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    )
  }
}
