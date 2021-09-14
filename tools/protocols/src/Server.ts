/* eslint-disable @typescript-eslint/member-ordering */
/*
  Copyright 2020 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import { ethers } from 'ethers'
import { REQUEST_TIMEOUT } from '@airswap/constants'
import { parseUrl, flattenObject } from '@airswap/utils'
import { Quote, LightOrder } from '@airswap/types'
import { Light } from './Light'
import { HTTPServer } from './HTTPServer'
import { EventEmitter } from 'events'
import { WebSocketServer } from './WebSocketServer'

export type SupportedProtocolInfo = {
  name: string
  version: string
  params?: any
}

type LocatorOptions = {
  protocol: string
  hostname: string
  port: string
  timeout?: number
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

export abstract class Server extends EventEmitter {
  protected swapContract: string
  protected locatorUrl: ReturnType<typeof parseUrl>
  protected locatorOptions: LocatorOptions
  protected supportedProtocols: SupportedProtocolInfo[]
  protected isInitialized: boolean

  public constructor(locator: string, swapContract = Light.getAddress()) {
    super()
    this.swapContract = swapContract
    this.locatorUrl = parseUrl(locator)
    this.locatorOptions = {
      protocol: this.locatorUrl.protocol,
      hostname: this.locatorUrl.hostname,
      port: this.locatorUrl.port,
      timeout: REQUEST_TIMEOUT,
    }
    this._initClient(locator, swapContract)
  }

  public static async for(locator: string, swapContract?: string) {
    if (!locator.match(/^wss?:\/\//)) {
      return new HTTPServer(locator, swapContract)
    } else {
      return new WebSocketServer(locator, swapContract)
    }
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
      p => p.name === protocol
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

  // ***   LAST LOOK METHODS   *** //
  protected initialize(supportedProtocols: SupportedProtocolInfo[]) {
    this.requireLastLookSupport()
    this.supportedProtocols = supportedProtocols
  }

  public async subscribe(pairs: { baseToken: string; quoteToken: string }[]) {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('subscribe', pairs)
  }

  public async unsubscribe(pairs: { baseToken: string; quoteToken: string }[]) {
    this.requireLastLookSupport()
    return this.callRPCMethod<boolean>('unsubscribe', pairs)
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
        `Server at ${this.locatorUrl} doesn't support this version of RFQ`
      )
  }

  /**
   * Throws if Last Look protocol is not supported, or if server is not yet
   * initialized.
   */
  protected requireLastLookSupport(version?: string) {
    if (!this.supportsProtocol('last-look', version))
      throw new Error(
        `Server at ${this.locatorUrl} doesn't support this version of Last Look`
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

  /**
   * This method should instantiate the relevenat transport client and also
   * trigger initialization, setting `isInitialized` when complete.
   */
  protected abstract _initClient(locator: string, swapContract: string): void
  protected abstract callRPCMethod<T>(
    method: string,
    params?: Record<string, string> | Array<any>
  ): Promise<T>
}
