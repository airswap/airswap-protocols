import * as url from 'url'
import { FullOrderERC20 } from '@airswap/types'
import { ethers } from 'ethers'
// @ts-ignore
import { isBrowser } from 'browser-or-node'
import { Client as HttpClient } from 'jayson'
import { TypedEmitter } from 'tiny-typed-emitter'

import {
  JsonRpcWebsocket,
  JsonRpcError,
  JsonRpcErrorCodes,
  WebsocketReadyStates,
} from '@airswap/jsonrpc-client-websocket'
import { chainIds } from '@airswap/constants'
import { parseUrl, orderERC20PropsToStrings } from '@airswap/utils'
import { OrderERC20, Pricing } from '@airswap/types'
import { SwapERC20 } from './SwapERC20'

export type SupportedProtocolInfo = {
  name: string
  version: string
  params?: any
}

export type ServerOptions = {
  chainId?: number
  swapContract?: string
  initializeTimeout?: number
}

if (!isBrowser) {
  JsonRpcWebsocket.setWebSocketFactory((url: string) => {
    const ws = require('websocket').w3cwebsocket
    return new ws(url)
  })
}

const REQUEST_TIMEOUT = 4000
const PROTOCOL_NAMES: { [index: string]: string } = {
  'last-look-erc20': 'Last Look (ERC20)',
  'request-for-quote-erc20': 'Request for Quote (ERC20)',
}

export type IndexedOrderResponse = {
  hash?: string | undefined
  order: FullOrderERC20
  addedOn: number
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
  public result: OrderResponse | ErrorResponse | SuccessResponse | undefined
  private jsonrpc = '2.0'

  public constructor(
    id: string,
    result: OrderResponse | IndexedOrderError | SuccessResponse | undefined
  ) {
    this.id = id
    if (result instanceof Error) {
      this.result = new ErrorResponse(result.code, result.message)
    } else {
      this.result = result
    }
  }
}

export interface ServerEvents {
  'pricing-erc20': (pricing: Pricing[]) => void
  error: (error: JsonRpcError) => void
}

export class Server extends TypedEmitter<ServerEvents> {
  public transportProtocol: 'websocket' | 'http'
  private supportedProtocols: SupportedProtocolInfo[] = []
  private isInitialized = false
  private httpClient: HttpClient | null = null
  private webSocketClient: JsonRpcWebsocket | null = null
  private senderServer: string | null = null
  private senderWallet: string | null = null

  public constructor(
    public locator: string,
    private swapContract = SwapERC20.getAddress(),
    private chainId = chainIds.MAINNET
  ) {
    super()
    const protocol = parseUrl(locator).protocol
    this.transportProtocol = protocol?.startsWith('http') ? 'http' : 'websocket'
  }

  public static async at(
    locator: string,
    options?: ServerOptions
  ): Promise<Server> {
    const server = new Server(locator, options?.swapContract, options?.chainId)
    await server._init(options?.initializeTimeout)
    return server
  }

  public getSupportedProtocolVersion(protocol: string): string | null {
    // Don't check supportedProtocols unless the server has initialized.
    // Important for WebSocket servers that can support either RFQ or Last Look
    this.requireInitialized()
    const supportedProtocolInfo = this.supportedProtocols.find(
      (p) => p.name === protocol
    )
    if (!supportedProtocolInfo) return null
    return supportedProtocolInfo.version
  }

  public supportsProtocol(
    protocol: string,
    requestedVersion?: string
  ): boolean {
    const supportedVersion = this.getSupportedProtocolVersion(protocol)
    if (!supportedVersion) return false
    if (!requestedVersion) return true

    const [, wantedMajor, wantedMinor, wantedPatch]: RegExpExecArray | [] =
      /(\d+)\.(\d+)\.(\d+)/.exec(requestedVersion) || []
    const [, supportedMajor, supportedMinor, supportedPatch]:
      | RegExpExecArray
      | [] = /(\d+)\.(\d+)\.(\d+)/.exec(supportedVersion) || []

    if (wantedMajor !== supportedMajor) return false
    if (parseInt(wantedMinor) > parseInt(supportedMinor)) return false
    if (parseInt(wantedPatch) > parseInt(supportedPatch)) return false
    return true
  }

  public async getSignerSideOrderERC20(
    senderAmount: string,
    signerToken: string,
    senderToken: string,
    senderWallet: string
  ): Promise<OrderERC20> {
    this.requireRFQERC20Support()
    return this.callRPCMethod<OrderERC20>('getSignerSideOrderERC20', {
      chainId: String(this.chainId),
      swapContract: this.swapContract,
      senderAmount: senderAmount.toString(),
      signerToken,
      senderToken,
      senderWallet,
    }).then((order) => {
      return orderERC20PropsToStrings(order)
    })
  }

  public async getSenderSideOrderERC20(
    signerAmount: string | ethers.BigNumber,
    signerToken: string,
    senderToken: string,
    senderWallet: string
  ): Promise<OrderERC20> {
    this.requireRFQERC20Support()
    return this.callRPCMethod<OrderERC20>('getSenderSideOrderERC20', {
      chainId: String(this.chainId),
      swapContract: this.swapContract,
      signerAmount: signerAmount.toString(),
      signerToken,
      senderToken,
      senderWallet,
    }).then((order) => {
      return orderERC20PropsToStrings(order)
    })
  }

  public async subscribePricingERC20(
    pairs: { baseToken: string; quoteToken: string }[]
  ): Promise<Pricing[]> {
    this.requireLastLookERC20Support()
    const pricing = await this.callRPCMethod<Pricing[]>(
      'subscribePricingERC20',
      [pairs]
    )
    this.emit('pricing-erc20', pricing)
    return pricing
  }

  public async unsubscribePricingERC20(
    pairs: { baseToken: string; quoteToken: string }[]
  ): Promise<boolean> {
    this.requireLastLookERC20Support()
    return this.callRPCMethod<boolean>('unsubscribePricingERC20', [pairs])
  }

  public async subscribeAllPricingERC20(): Promise<boolean> {
    this.requireLastLookERC20Support()
    return this.callRPCMethod<boolean>('subscribeAllPricingERC20', [])
  }

  public async unsubscribeAllPricingERC20(): Promise<boolean> {
    this.requireLastLookERC20Support()
    return this.callRPCMethod<boolean>('unsubscribeAllPricingERC20', [])
  }

  public getSenderWallet(): string | null {
    this.requireLastLookERC20Support()
    return this.senderWallet
  }

  public async considerOrderERC20(order: OrderERC20): Promise<boolean> {
    this.requireLastLookERC20Support()
    return this.callRPCMethod<boolean>('considerOrderERC20', order)
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

  public disconnect(): void {
    if (this.webSocketClient) {
      if (this.webSocketClient.state !== WebsocketReadyStates.CLOSED) {
        this.webSocketClient.close()
        // Note that we remove listeners only after close as closing before a
        // successful connection will emit an error, and emitting an error
        // without a listener will throw. Removing listeners before close means
        // closing before connecting would cause an unpreventable throw (error
        // listener would be removed first).
        this.webSocketClient.on('close', () => {
          this.removeAllListeners()
        })
      } else {
        this.removeAllListeners()
      }
      this.webSocketClient = null
    }
  }

  private _init(initializeTimeout: number = REQUEST_TIMEOUT) {
    if (this.transportProtocol === 'http') {
      return this._initHTTPClient(this.locator)
    } else {
      return this._initWebSocketClient(this.locator, initializeTimeout)
    }
  }

  private _initHTTPClient(locator: string, clientOnly?: boolean) {
    // clientOnly flag set when initializing client for last look `senderServer`
    const parsedUrl = parseUrl(locator)
    const options = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      timeout: REQUEST_TIMEOUT,
    }

    if (!clientOnly) {
      this.supportedProtocols = [
        { name: 'request-for-quote-erc20', version: '2.0.0' },
      ]
      this.isInitialized = true
    }

    if (isBrowser) {
      const jaysonClient = require('jayson/lib/client/browser')
      this.httpClient = new jaysonClient((request: any, callback: any) => {
        fetch(url.format(parsedUrl), {
          method: 'POST',
          body: request,
          headers: {
            'Content-Type': 'application/json',
          },
        })
          .then((res: any) => {
            return res.text()
          })
          .then((text: any) => {
            callback(null, text)
          })
          .catch((err: any) => {
            callback(err)
          })
      }, options)
    } else {
      const jaysonClient = require('jayson/lib/client')
      if (options.protocol === 'https:') {
        this.httpClient = jaysonClient.https(options)
      } else {
        this.httpClient = jaysonClient.http(options)
      }
    }
  }

  private async _initWebSocketClient(
    locator: string,
    initializeTimeout: number
  ) {
    const initPromise = new Promise<SupportedProtocolInfo[]>(
      (resolve, reject) => {
        this.webSocketClient = new JsonRpcWebsocket(
          url.format(locator),
          REQUEST_TIMEOUT,
          (error: JsonRpcError) => {
            if (!this.isInitialized) {
              reject(error)
            } else {
              this.emit('error', error)
            }
          }
        )
        const initTimeout = setTimeout(() => {
          reject('Server did not call setProtocols in time')
          this.disconnect()
        }, initializeTimeout)

        this.webSocketClient.on('setProtocols', (message) => {
          clearTimeout(initTimeout)
          try {
            this.setProtocols(message)
            this.isInitialized = true
            resolve(this.supportedProtocols)
            return true
          } catch (e) {
            reject(e)
            return false
          }
        })
      }
    )

    this.webSocketClient?.on('setPricingERC20', this.setPricingERC20.bind(this))
    await this.webSocketClient?.open()
    await initPromise
  }

  private requireInitialized() {
    if (!this.isInitialized) throw new Error('Server not yet initialized')
  }

  private requireRFQERC20Support(version?: string) {
    this.requireProtocolSupport('request-for-quote-erc20', version)
  }

  private requireLastLookERC20Support(version?: string) {
    this.requireProtocolSupport('last-look-erc20', version)
  }

  private requireProtocolSupport(protocol: string, version?: string) {
    if (!this.supportsProtocol(protocol, version)) {
      const supportedVersion = this.getSupportedProtocolVersion(protocol)
      let message
      if (supportedVersion) {
        message =
          `Server at ${this.locator} doesn't support ` +
          `${PROTOCOL_NAMES[protocol]} v${version}` +
          `supported version ${supportedVersion}`
      } else {
        message =
          `Server at ${this.locator} doesn't ` +
          `support ${PROTOCOL_NAMES[protocol]}`
      }
      throw new Error(message)
    }
  }

  private compare(params: any, flat: any): Array<string> {
    const errors: Array<string> = []
    for (const param in params) {
      if (
        typeof flat === 'object' &&
        param in flat &&
        flat[param].toLowerCase() !== params[param].toLowerCase()
      ) {
        errors.push(param)
      }
    }
    return errors
  }

  private throwInvalidParams(method: string, params: string) {
    throw {
      code: JsonRpcErrorCodes.INVALID_PARAMS,
      message: `Received invalid param format or values for method "${method}": ${params}`,
    }
  }

  private validateInitializeParams(params: any): void {
    let valid = true
    if (!Array.isArray(params)) valid = false
    if (
      valid &&
      !params.every(
        (protocolInfo: any) => protocolInfo.version && protocolInfo.name
      )
    )
      valid = false
    if (!valid) this.throwInvalidParams('setProtocols', JSON.stringify(params))
  }

  private validateUpdatePricingParams(params: any): void {
    let valid = true
    if (!Array.isArray(params)) valid = false
    if (
      valid &&
      !params.every(
        (pricing: Pricing) =>
          pricing.baseToken &&
          pricing.quoteToken &&
          Array.isArray(pricing.bid) &&
          Array.isArray(pricing.ask)
      )
    )
      valid = false
    if (!valid)
      this.throwInvalidParams('setPricingERC20', JSON.stringify(params))
  }

  private setPricingERC20(newPricing: Pricing[]) {
    this.validateUpdatePricingParams(newPricing)
    this.emit('pricing-erc20', newPricing)
    return true
  }

  private setProtocols(supportedProtocols: SupportedProtocolInfo[]) {
    this.validateInitializeParams(supportedProtocols)
    this.supportedProtocols = supportedProtocols
    const lastLookERC20Support = supportedProtocols.find(
      (protocol) => protocol.name === 'last-look-erc20'
    )
    if (lastLookERC20Support?.params?.senderServer) {
      this.senderServer = lastLookERC20Support.params.senderServer
      // Prepare an http client for consider calls.
      this._initHTTPClient(lastLookERC20Support.params.senderServer, true)
    }
    if (lastLookERC20Support?.params?.senderWallet) {
      this.senderWallet = lastLookERC20Support.params.senderWallet
    }
  }

  private toBigIntJson(requestFilter: RequestFilter) {
    return JSON.parse(
      JSON.stringify(requestFilter, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    )
  }

  private httpCall<T>(
    method: string,
    params: Record<string, string> | Array<any>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.httpClient?.request(
        method,
        params,
        (connectionError: any, serverError: any, result: any) => {
          if (connectionError) {
            reject({ code: -1, message: connectionError.message })
          } else if (serverError) {
            reject(serverError)
          } else {
            const errors = this.compare(params, result)
            if (errors.length) {
              reject({
                code: -1,
                message: `Server response differs from request params: ${errors}`,
              })
            } else {
              resolve(result)
            }
          }
        }
      )
    })
  }

  private async webSocketCall<T>(
    method: string,
    params?: Record<string, string> | Array<any>
  ): Promise<T> {
    const response = await this.webSocketClient?.call(method, params)
    return response?.result as T
  }

  /**
   * This method should instantiate the relevenat transport client and also
   * trigger initialization, setting `isInitialized` when complete.
   */
  private async callRPCMethod<T>(
    method: string,
    params: Record<string, string> | Array<any>
  ): Promise<T> {
    if (
      this.transportProtocol === 'http' ||
      (method === 'considerOrderERC20' && this.senderServer)
    ) {
      return this.httpCall<T>(method, params)
    } else {
      return this.webSocketCall<T>(method, params)
    }
  }
}
