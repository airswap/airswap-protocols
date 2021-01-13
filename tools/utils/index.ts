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
import * as url from 'url'

import { etherscanDomains } from '@airswap/constants'
import { Quote, Order } from '@airswap/types'

export * from './src/hashes'
export * from './src/orders'
export * from './src/quotes'

function getLowest(objects: Array<Quote> | Array<Order>, key: string): any {
  let best: any
  let bestAmount
  let amount
  for (const obj of objects) {
    if (!obj[key]) continue
    if (obj[key].amount != undefined) {
      // if its a quote, it has .amount
      amount = ethers.BigNumber.from(obj[key].amount)
    } else {
      // if its an order, it has .data
      amount = ethers.BigNumber.from(obj[key].data.slice(0, 66))
    }
    if (!best || amount.lt(bestAmount)) {
      bestAmount = amount
      best = obj
    }
  }
  return best
}

function getHighest(objects: Array<Quote> | Array<Order>, key: string): any {
  let best: any
  let bestAmount
  let amount
  for (const obj of objects) {
    if (!obj[key]) continue
    if (obj[key].amount != undefined) {
      // if its a quote, it has .amount
      amount = ethers.BigNumber.from(obj[key].amount)
    } else {
      // if its an order, it has .data
      amount = ethers.BigNumber.from(obj[key].data.slice(0, 66))
    }
    if (!best || amount.gt(bestAmount)) {
      bestAmount = amount
      best = obj
    }
  }
  return best
}

export function getBestByLowestSenderAmount(
  objects: Array<Quote> | Array<Order>
): any {
  return getLowest(objects, 'sender')
}

export function getBestByLowestSignerAmount(
  objects: Array<Quote> | Array<Order>
): any {
  return getLowest(objects, 'signer')
}

export function getBestByHighestSignerAmount(
  objects: Array<Quote> | Array<Order>
): any {
  return getHighest(objects, 'signer')
}

export function getBestByHighestSenderAmount(
  objects: Array<Quote> | Array<Order>
): any {
  return getHighest(objects, 'sender')
}

export function toDecimalString(
  value: string | ethers.BigNumber,
  decimals: string | number
): string {
  return ethers.utils.formatUnits(value.toString(), decimals).toString()
}

export function toAtomicString(
  value: string | ethers.BigNumber,
  decimals: string | number
): string {
  return ethers.utils.parseUnits(value.toString(), decimals).toString()
}

export function getTimestamp(): string {
  return Math.round(Date.now() / 1000).toString()
}

export function parseUrl(locator: string): url.UrlWithStringQuery {
  if (!/^http:\/\//.test(locator) && !/^https:\/\//.test(locator)) {
    locator = `https://${locator}`
  }
  return url.parse(locator)
}

export function getEtherscanURL(chainId: string, hash: string) {
  return `https://${etherscanDomains[chainId]}/tx/${hash}`
}

export function flattenObject(obj: any, propName = '', result = {}) {
  if (Object(obj) !== obj) {
    result[propName] = obj
  } else {
    for (const prop in obj) {
      flattenObject(
        obj[prop],
        propName
          ? propName + prop.charAt(0).toUpperCase() + prop.slice(1)
          : prop,
        result
      )
    }
  }
  return result
}

export function lowerCaseAddresses(obj: any): any {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      lowerCaseAddresses(obj[key])
    } else if (typeof obj[key] === 'string' && obj[key].indexOf('0x') === 0) {
      obj[key] = obj[key].toLowerCase()
    } else {
      obj[key] = obj[key].toString()
    }
  }
  return obj
}
