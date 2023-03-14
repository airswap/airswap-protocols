import * as url from 'url'
import { ethers } from 'ethers'
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

export type MakerOptions = {
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
const PROTOCOL_NAMES = {
  'last-look': 'Last Look',
  'request-for-quote': 'Request for Quote',
}

export interface MakerEvents {
  pricing: (pricing: Pricing[]) => void
  error: (error: JsonRpcError) => void
}

export class Maker extends TypedEmitter<MakerEvents> {
  public transportProtocol: 'websocket' | 'http'
  private supportedProtocols: SupportedProtocolInfo[]
  private isInitialized: boolean
  private httpClient: HttpClient
  private webSocketClient: JsonRpcWebsocket
  private senderMaker: string
  private senderWallet: string

  public constructor(
    public locator: string,
    private swapContract = SwapERC20.getAddress(),
    private chainId = chainIds.MAINNET
  ) {
    super()
    const protocol = parseUrl(locator).protocol
    this.transportProtocol = protocol.startsWith('http') ? 'http' : 'websocket'
  }

  public static async at(
    locator: string,
    options?: MakerOptions
  ): Promise<Maker> {
    const server = new Maker(locator, options?.swapContract, options?.chainId)
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

    const [, wantedMajor, wantedMinor, wantedPatch] =
      /(\d+)\.(\d+)\.(\d+)/.exec(requestedVersion)
    const [, supportedMajor, supportedMinor, supportedPatch] =
      /(\d+)\.(\d+)\.(\d+)/.exec(supportedVersion)

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
    this.requireRFQSupport()
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
    this.requireRFQSupport()
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

  public async subscribe(
    pairs: { baseToken: string; quoteToken: string }[]
  ): Promise<Pricing[]> {
    this.requireLastLookSupport()
    const pricing = await this.callRPCMethod<Pricing[]>('subscribe', [pairs])
    this.emit('pricing', pricing)
    return pricing
  }

  public async unsubscribe(
    pairs: { baseToken: string; quoteToken: string }[]
  ): Promise<boolean> {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('unsubscribe', [pairs])
  }

  public async subscribeAll(): Promise<boolean> {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('subscribeAll')
  }

  public async unsubscribeAll(): Promise<boolean> {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('unsubscribeAll')
  }

  public getSenderWallet(): string {
    this.requireLastLookSupport()
    return this.senderWallet
  }

  public async consider(order: OrderERC20): Promise<boolean> {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('consider', order)
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
      delete this.webSocketClient
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
    // clientOnly flag set when initializing client for last look `senderMaker`
    const parsedUrl = parseUrl(locator)
    const options = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      timeout: REQUEST_TIMEOUT,
    }

    if (!clientOnly) {
      this.supportedProtocols = [
        { name: 'request-for-quote', version: '2.0.0' },
      ]
      this.isInitialized = true
    }

    if (isBrowser) {
      const jaysonClient = require('jayson/lib/client/browser')
      this.httpClient = new jaysonClient((request, callback) => {
        fetch(url.format(parsedUrl), {
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
          reject('Maker did not call initialize in time')
          this.disconnect()
        }, initializeTimeout)

        this.webSocketClient.on('initialize', (message) => {
          clearTimeout(initTimeout)
          try {
            this.initialize(message)
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

    this.webSocketClient.on('updatePricing', this.updatePricing.bind(this))
    await this.webSocketClient.open()
    await initPromise
  }

  private requireInitialized() {
    if (!this.isInitialized) throw new Error('Maker not yet initialized')
  }

  private requireRFQSupport(version?: string) {
    this.requireProtocolSupport('request-for-quote', version)
  }

  private requireLastLookSupport(version?: string) {
    this.requireProtocolSupport('last-look', version)
  }

  private requireProtocolSupport(protocol: string, version?: string) {
    if (!this.supportsProtocol(protocol, version)) {
      const supportedVersion = this.getSupportedProtocolVersion(protocol)
      let message
      if (supportedVersion) {
        message =
          `Maker at ${this.locator} doesn't support ` +
          `${PROTOCOL_NAMES[protocol]} v${version}` +
          `supported version ${supportedVersion}`
      } else {
        message =
          `Maker at ${this.locator} doesn't ` +
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
      !params.every((protocolInfo) => protocolInfo.version && protocolInfo.name)
    )
      valid = false
    if (!valid) this.throwInvalidParams('initialize', JSON.stringify(params))
  }

  private validateUpdatePricingParams(params: any): void {
    let valid = true
    if (!Array.isArray(params)) valid = false
    if (
      valid &&
      !params.every(
        (pricing) =>
          pricing.baseToken &&
          pricing.quoteToken &&
          Array.isArray(pricing.bid) &&
          Array.isArray(pricing.ask)
      )
    )
      valid = false
    if (!valid) this.throwInvalidParams('updatePricing', JSON.stringify(params))
  }

  private updatePricing(newPricing: Pricing[]) {
    this.validateUpdatePricingParams(newPricing)
    this.emit('pricing', newPricing)
    return true
  }

  private initialize(supportedProtocols: SupportedProtocolInfo[]) {
    this.validateInitializeParams(supportedProtocols)
    this.supportedProtocols = supportedProtocols
    const lastLookSupport = supportedProtocols.find(
      (protocol) => protocol.name === 'last-look'
    )
    if (lastLookSupport?.params?.senderMaker) {
      this.senderMaker = lastLookSupport.params.senderMaker
      // Prepare an http client for consider calls.
      this._initHTTPClient(this.senderMaker, true)
    }
    if (lastLookSupport?.params?.senderWallet) {
      this.senderWallet = lastLookSupport.params.senderWallet
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
            const errors = this.compare(params, result)
            if (errors.length) {
              reject({
                code: -1,
                message: `Maker response differs from request params: ${errors}`,
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
    const response = await this.webSocketClient.call(method, params)
    return response.result as T
  }

  /**
   * This method should instantiate the relevenat transport client and also
   * trigger initialization, setting `isInitialized` when complete.
   */
  private async callRPCMethod<T>(
    method: string,
    params?: Record<string, string> | Array<any>
  ): Promise<T> {
    if (
      this.transportProtocol === 'http' ||
      (method === 'consider' && this.senderMaker)
    ) {
      return this.httpCall<T>(method, params)
    } else {
      return this.webSocketCall<T>(method, params)
    }
  }
}
