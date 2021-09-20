/* eslint-disable @typescript-eslint/member-ordering */
import * as url from 'url'
import { ethers } from 'ethers'
import { isBrowser } from 'browser-or-node'
import { Client as HttpClient } from 'jayson'
import { JsonRpcWebsocket, JsonRpcError } from 'jsonrpc-client-websocket'

import { REQUEST_TIMEOUT } from '@airswap/constants'
import { parseUrl, flattenObject, isValidQuote } from '@airswap/utils'
import { Quote, LightOrder } from '@airswap/types'

import { Light } from './Light'
import { EventEmitter } from 'events'

export type SupportedProtocolInfo = {
  name: string
  version: string
  params?: any
}

type Levels = [string, string][]
type Formula = string

type PricingDetails =
  | {
      bid: Levels
      ask: Levels
    }
  | {
      bid: Formula
      ask: Formula
    }

type Pricing = {
  baseToken: string
  quoteToken: string
} & PricingDetails

if (!isBrowser) {
  JsonRpcWebsocket.setWebSocketFactory((url: string) => {
    const ws = require('websocket').client
    return new ws(url)
  })
}

export class Server extends EventEmitter {
  protected supportedProtocols: SupportedProtocolInfo[]
  protected isInitialized: boolean
  private httpClient: HttpClient
  private webSocketClient: JsonRpcWebsocket
  private senderServer: string
  public transportProtocol: 'websockets' | 'http'

  public constructor(
    private locator: string,
    private swapContract = Light.getAddress()
  ) {
    super()
    const protocol = parseUrl(locator).protocol
    this.transportProtocol = protocol.startsWith('http') ? 'http' : 'websockets'
  }

  private _init() {
    if (this.transportProtocol === 'http') {
      return this._initHTTPClient(this.locator)
    } else {
      return this._initWebSocketClient(this.locator)
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

  private async _initWebSocketClient(locator: string) {
    this.webSocketClient = new JsonRpcWebsocket(
      url.format(locator),
      2000,
      (error: JsonRpcError) => {
        /* handle error */
        console.error(error)
      }
    )
    const initPromise = new Promise<SupportedProtocolInfo[]>((resolve) => {
      this.webSocketClient.on('initialize', (message) => {
        // TODO: swapcontract is included in the initialize protocol payloads
        // need to check it.
        this.isInitialized = true
        this.initialize(message)
        resolve(this.supportedProtocols)
      })
    })

    this.webSocketClient.on('updatePricing', this.updatePricing.bind(this))

    await this.webSocketClient.open()
    await initPromise

    // TODO: connection timeout:
    // this.ws.on('open', cleartimeout....)

    // TODO: connectivity lifecycle
  }

  public static async for(
    locator: string,
    swapContract?: string
  ): Promise<Server> {
    const server = new Server(locator, swapContract)
    await server._init()
    return server
  }

  /**
   * Method to check support for a given swap protocol.
   * @param protocol String protocol name
   * @param minVersion String minimum required version (semVer). If not supplied
   *                          all versions match.
   * @returns boolean true if protocol is supported at given version
   */
  public supportsProtocol(protocol: string, minVersion?: string) {
    // Don't check supportedProtocols unless the server has initialized.
    // Important for WebSocket servers that can support either RFQ or Last Look
    this.requireInitialized()
    const supportedProtocolInfo = this.supportedProtocols.find(
      (p) => p.name === protocol
    )
    if (!supportedProtocolInfo) return false
    if (!minVersion) return true
    // TODO: semVer matching.
  }

  // ***   RFQ METHODS   *** //
  public async getMaxQuote(
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
    this.requireRFQSupport()
    return this.callRPCMethod<Quote>('getMaxQuote', {
      signerToken,
      senderToken,
    })
  }

  public async getSignerSideQuote(
    senderAmount: string,
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
    this.requireRFQSupport()
    return this.callRPCMethod<Quote>('getSignerSideQuote', {
      senderAmount: senderAmount.toString(),
      signerToken,
      senderToken,
    })
  }

  public async getSenderSideQuote(
    signerAmount: string,
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
    this.requireRFQSupport()
    return this.callRPCMethod<Quote>('getSenderSideQuote', {
      signerAmount: signerAmount.toString(),
      signerToken,
      senderToken,
    })
  }

  public async getSignerSideOrder(
    senderAmount: string,
    signerToken: string,
    senderToken: string,
    senderWallet: string
  ): Promise<LightOrder> {
    this.requireRFQSupport()
    return this.callRPCMethod<LightOrder>('getSignerSideOrder', {
      senderAmount: senderAmount.toString(),
      signerToken,
      senderToken,
      senderWallet,
    })
  }

  public async getSenderSideOrder(
    signerAmount: string | ethers.BigNumber,
    signerToken: string,
    senderToken: string,
    senderWallet: string
  ): Promise<LightOrder> {
    this.requireRFQSupport()
    return this.callRPCMethod('getSenderSideOrder', {
      signerAmount: signerAmount.toString(),
      signerToken,
      senderToken,
      senderWallet,
    })
  }
  // *** END RFQ METHODS *** //

  protected initialize(supportedProtocols: SupportedProtocolInfo[]) {
    this.supportedProtocols = supportedProtocols
    const lastLookSupport = supportedProtocols.find(
      (protocol) => protocol.name === 'last-look'
    )
    if (lastLookSupport?.params?.senderServer) {
      this.senderServer = lastLookSupport.params.senderServer
      // Prepare an http client for consider calls.
      this._initHTTPClient(this.senderServer, true)
    }
  }

  // ***   LAST LOOK METHODS   *** //
  public async subscribe(pairs: { baseToken: string; quoteToken: string }[]) {
    this.requireLastLookSupport()
    const pricing = await this.callRPCMethod<Pricing[]>('subscribe', pairs)
    this.emit('pricing', pricing)
    return pricing
  }

  public async unsubscribe(pairs: { baseToken: string; quoteToken: string }[]) {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('unsubscribe', [pairs])
  }

  public async subscribeAll() {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('subscribeAll')
  }

  public async unsubscribeAll() {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('unsubscribeAll')
  }

  protected updatePricing(newPricing: Pricing[]) {
    this.emit('pricing', newPricing)
  }

  /**
   * @param pair The baseToken and quoteToken to listen to pricing updates for.
   * @param callback Function to call with updated pricing
   * @returns A teardown function to remove the listener.
   */
  public addPairPriceListener(
    pair: { baseToken: string; quoteToken: string },
    callback: (newPricing: Pricing) => void
  ): () => void {
    this.requireLastLookSupport()
    const listener = (newPricing: Pricing[]) => {
      const tokenPricing = newPricing.find((pricing) => {
        pricing.baseToken.toLowerCase() === pair.baseToken.toLowerCase() &&
          pricing.quoteToken === pair.baseToken
      })
      if (tokenPricing) {
        callback(tokenPricing)
      }
    }
    this.on('pricing', listener)

    // Return a teardown function for the listener.
    return this.off.bind(this, 'pricing', listener)
  }

  public async consider(order: LightOrder) {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('consider', order)
  }
  // *** END LAST LOOK METHODS *** //

  protected requireInitialized() {
    if (!this.isInitialized) throw new Error('Server not yet initialized')
  }

  /**
   * Throws if RFQ protocol is not supported, or if server is not yet
   * initialized.
   */
  protected requireRFQSupport(version?: string) {
    if (!this.supportsProtocol('request-for-quote', version))
      throw new Error(
        `Server at ${this.locator} doesn't support this version of RFQ`
      )
  }

  /**
   * Throws if Last Look protocol is not supported, or if server is not yet
   * initialized.
   */
  protected requireLastLookSupport(version?: string) {
    if (!this.supportsProtocol('last-look', version))
      throw new Error(
        `Server at ${this.locator} doesn't support this version of Last Look`
      )
  }

  protected compare(params: any, result: any): Array<string> {
    const errors: Array<string> = []
    const flat: any = flattenObject(result)
    for (const param in params) {
      if (
        param in flat &&
        flat[param].toLowerCase() !== params[param].toLowerCase()
      ) {
        errors.push(param)
      }
    }
    return errors
  }

  protected httpCall<T>(
    method: string,
    params: Record<string, string> | Array<any>
  ): Promise<T> {
    if (!Array.isArray(params)) {
      params.swapContract = this.swapContract
    }
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
                message: `Server response differs from request params: ${errors}`,
              })
            } else {
              if (method.indexOf('Quote') !== -1 && !isValidQuote(result)) {
                reject({
                  code: -1,
                  message: `Server response is not a valid quote: ${JSON.stringify(
                    result
                  )}`,
                })
              } else {
                resolve(result)
              }
            }
          }
        }
      )
    })
  }

  protected async webSocketCall<T>(
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
  protected async callRPCMethod<T>(
    method: string,
    params?: Record<string, string> | Array<any>
  ): Promise<T> {
    if (
      this.transportProtocol === 'http' ||
      (method === 'consider' && this.senderServer)
    ) {
      return this.httpCall<T>(method, params)
    } else {
      return this.webSocketCall<T>(method, params)
    }
  }
}
