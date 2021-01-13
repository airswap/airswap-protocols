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
import { Client, JSONRPCRequest } from 'jayson'
import { REQUEST_TIMEOUT } from '@airswap/constants'
import {
  parseUrl,
  flattenObject,
  isValidOrder,
  isValidQuote,
} from '@airswap/utils'
import { Quote, Order } from '@airswap/types'

let jaysonClient
if (typeof window !== 'undefined') {
  jaysonClient = require('jayson/lib/client/browser')
} else {
  jaysonClient = require('jayson/lib/client')
}

export class Server {
  private client: Client

  public constructor(locator: string) {
    const locatorUrl = parseUrl(locator)
    const options = {
      protocol: locatorUrl.protocol,
      hostname: locatorUrl.hostname,
      port: locatorUrl.port,
      timeout: REQUEST_TIMEOUT,
    }
    if (options.protocol === 'https:') {
      this.client = jaysonClient.https(options)
    } else {
      this.client = jaysonClient.http(options)
    }
  }

  public async getMaxQuote(
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
    return new Promise((resolve, reject) => {
      this.generateRequest(
        'getMaxQuote',
        {
          signerToken,
          senderToken,
        },
        resolve,
        reject
      )
    })
  }

  public async getSignerSideQuote(
    senderAmount: string,
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
    return new Promise((resolve, reject) => {
      this.generateRequest(
        'getSignerSideQuote',
        {
          senderAmount: senderAmount.toString(),
          signerToken,
          senderToken,
        },
        resolve,
        reject
      )
    })
  }

  public async getSenderSideQuote(
    signerAmount: string,
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
    return new Promise((resolve, reject) => {
      this.generateRequest(
        'getSenderSideQuote',
        {
          signerAmount: signerAmount.toString(),
          signerToken,
          senderToken,
        },
        resolve,
        reject
      )
    })
  }

  public async getSignerSideOrder(
    senderAmount: string,
    signerToken: string,
    senderToken: string,
    senderWallet: string
  ): Promise<Order> {
    return new Promise((resolve, reject) => {
      this.generateRequest(
        'getSignerSideOrder',
        {
          senderAmount: senderAmount.toString(),
          signerToken,
          senderToken,
          senderWallet,
        },
        resolve,
        reject
      )
    })
  }

  public async getSenderSideOrder(
    signerAmount: string | ethers.BigNumber,
    signerToken: string,
    senderToken: string,
    senderWallet: string
  ): Promise<Order> {
    return new Promise((resolve, reject) => {
      this.generateRequest(
        'getSenderSideOrder',
        {
          signerAmount: signerAmount.toString(),
          signerToken,
          senderToken,
          senderWallet,
        },
        resolve,
        reject
      )
    })
  }

  private compare(params: any, result: any): Array<string> {
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

  private generateRequest(
    method: string,
    params: Record<string, string>,
    resolve: Function,
    reject: Function
  ): JSONRPCRequest {
    return this.client.request(
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
            } else if (
              method.indexOf('Order') !== -1 &&
              !isValidOrder(result)
            ) {
              reject({
                code: -1,
                message: `Server response is not a valid order: ${JSON.stringify(
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
  }
}
