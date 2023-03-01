import * as url from 'url'
import { isBrowser } from 'browser-or-node'
import { Client as HttpClient } from 'jayson'
import { FullOrderERC20 } from '@airswap/types'
import { parseUrl } from '@airswap/utils'

const REQUEST_TIMEOUT = 4000

export type IndexedOrderResponse = {
  hash?: string | undefined
  order: FullOrderERC20
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
    this.message = message
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
    if (result instanceof Error) {
      this.result = new ErrorResponse(result.code, result.message)
    } else {
      this.result = result
    }
  }
}

export class NodeIndexer {
  private httpClient: HttpClient

  public constructor(locator: string) {
    const parsedUrl = parseUrl(locator)
    const options = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      timeout: REQUEST_TIMEOUT,
    }

    if (isBrowser) {
      const jaysonClient = require('jayson/lib/client/browser')
      this.httpClient = new jaysonClient((request, callback) => {
        fetch(url.format(locator), {
          method: 'POST',
          body: request,
          headers: {
            'Content-Type': 'application/json',
          },
        })
          .then((res) => {
            return res.text()
          })
          .then((text) => {
            callback(null, text)
          })
          .catch((err) => {
            callback(err)
          })
      })
    } else {
      const jaysonClient = require('jayson/lib/client')
      if (options.protocol === 'https:') {
        this.httpClient = jaysonClient.https(options)
      } else {
        this.httpClient = jaysonClient.http(options)
      }
    }
  }

  public async getOrdersERC20By(
    requestFilter: RequestFilter,
    filters = false
  ): Promise<OrderResponse> {
    try {
      return Promise.resolve(
        (await this.httpCall('getOrdersERC20', [
          { ...this.toBigIntJson(requestFilter), filters },
        ])) as OrderResponse
      )
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public async getOrdersERC20(): Promise<OrderResponse> {
    try {
      return Promise.resolve(
        (await this.httpCall('getOrdersERC20', [{}])) as OrderResponse
      )
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public async addOrderERC20(
    fullOrder: FullOrderERC20
  ): Promise<SuccessResponse> {
    try {
      return Promise.resolve(
        (await this.httpCall('addOrderERC20', [fullOrder])) as SuccessResponse
      )
    } catch (err) {
      return Promise.reject(err)
    }
  }

  private httpCall<T>(
    method: string,
    params: Record<string, string> | Array<any>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.httpClient.request(
        method,
        params,
        (connectionError: any, serverError: any, result: any) => {
          if (connectionError) {
            reject({ code: -1, message: connectionError.message })
          } else if (serverError) {
            reject(serverError)
          } else {
            resolve(result)
          }
        }
      )
    })
  }

  private toBigIntJson(requestFilter: RequestFilter) {
    return JSON.parse(
      JSON.stringify(requestFilter, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    )
  }
}
