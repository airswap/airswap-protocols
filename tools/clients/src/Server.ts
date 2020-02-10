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

import * as url from 'url'
import * as jayson from 'jayson'
import { BigNumber } from 'ethers/utils'
import { REQUEST_TIMEOUT } from '@airswap/constants'

export class Server {
  _client: any

  constructor(locator: string) {
    if (!/^http:\/\//.test(locator) && !/^https:\/\//.test(locator)) {
      locator = `https://${locator}`
    }

    const locatorUrl = url.parse(locator)
    const options = {
      protocol: locatorUrl.protocol,
      hostname: locatorUrl.hostname,
      port: locatorUrl.port,
      timeout: REQUEST_TIMEOUT,
    }

    if (options.protocol === 'http:') {
      this._client = jayson.Client.http(options)
    } else if (options.protocol === 'https:') {
      this._client = jayson.Client.https(options)
    }
  }

  async getMaxQuote(signerToken: string, senderToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this._generateRequest(
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

  async getSignerSideQuote(
    senderAmount: string,
    signerToken: string,
    senderToken: string
  ) {
    return new Promise((resolve, reject) => {
      this._generateRequest(
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

  async getSenderSideQuote(
    signerAmount: string,
    signerToken: string,
    senderToken: string
  ) {
    return new Promise((resolve, reject) => {
      this._generateRequest(
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

  async getSignerSideOrder(
    senderAmount: string,
    signerToken: string,
    senderToken: string,
    senderWallet: string
  ) {
    return new Promise((resolve, reject) => {
      this._generateRequest(
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

  async getSenderSideOrder(
    signerAmount: string | BigNumber,
    signerToken: string,
    senderToken: string,
    senderWallet: string
  ) {
    return new Promise((resolve, reject) => {
      this._generateRequest(
        'getSenderSideOrder',
        {
          signerAmount,
          signerToken,
          senderToken,
          senderWallet,
        },
        resolve,
        reject
      )
    })
  }

  _generateRequest(
    method: string,
    params: any,
    resolve: Function,
    reject: Function
  ) {
    this._client.request(
      method,
      params,
      (err: any, error: any, result: any) => {
        if (err || error) {
          reject(err || error)
        } else {
          resolve(result)
        }
      }
    )
  }
}
