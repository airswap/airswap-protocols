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
import { BigNumber } from 'ethers/utils'
import * as url from 'url'
import { Quote, Order } from '@airswap/types'

export * from './src/hashes'
export * from './src/orders'
export * from './src/quotes'

export function getBestByLowestSenderAmount(
  objects: Array<Quote> | Array<Order>
): any {
  let best: any
  for (const obj of objects) {
    if (!best || new BigNumber(obj.sender.amount).lt(best.sender.amount)) {
      best = obj
    }
  }
  return best
}

export function getBestByHighestSignerAmount(
  objects: Array<Quote> | Array<Order>
): any {
  let best: any
  for (const obj of objects) {
    if (!best || new BigNumber(obj.signer.amount).gt(best.signer.amount)) {
      best = obj
    }
  }
  return best
}

export function toDecimalString(
  value: string | BigNumber,
  decimals: string | number
): string {
  return ethers.utils.formatUnits(value.toString(), decimals).toString()
}

export function toAtomicString(
  value: string | BigNumber,
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
