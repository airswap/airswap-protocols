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

export interface SupportedProtocolInfo {
  name: string
  version: string
  params?: any
}

interface LocatorOptions {
  protocol: string
  hostname: string
  port: string
  timeout?: number
}

export abstract class Server {
  protected swapContract: string
  protected locatorUrl: ReturnType<typeof parseUrl>
  protected locatorOptions: LocatorOptions
  protected supportedProtocols: SupportedProtocolInfo[]

  public constructor(locator: string, swapContract = Light.getAddress()) {
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
    const supportedProtocolInfo = this.supportedProtocols.find(
      p => p.name === protocol
    )
    if (!supportedProtocolInfo) return false
    if (!minVersion) return true
    // TODO: semVer matching.
  }

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

  protected requireRFQSupport(version?: string) {
    if (!this.supportsProtocol('request-for-quote', version))
      throw new Error(
        `Server at ${this.locatorUrl} doesn't support this version of RFQ`
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

  protected abstract _initClient(locator: string, swapContract: string): void
  protected abstract callRPCMethod<T>(
    method: string,
    params: Record<string, string>
  ): Promise<T>
}
