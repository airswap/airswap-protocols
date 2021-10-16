/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ethers } from 'ethers'
import * as url from 'url'
import BigNumber from 'bignumber.js'

import { etherscanDomains } from '@airswap/constants'
import { Quote, Order, Levels, Formula } from '@airswap/types'

export * from './src/hashes'
export * from './src/orders'
export * from './src/quotes'

export function calculateCost(amount: string, pricing: Formula | Levels) {
  // TODO: Formula support
  if (typeof pricing !== 'string') {
    return calculateCostFromLevels(amount, pricing)
  }
  return null
}

export function calculateCostFromLevels(amount: string, levels: Levels) {
  const totalAmount = new BigNumber(amount)
  const totalAvailable = new BigNumber(levels[levels.length - 1][0])
  let totalCost = new BigNumber(0)
  let previousLevel = new BigNumber(0)

  if (totalAmount.gt(totalAvailable)) {
    throw new Error(
      `Requested amount (${totalAmount.toFixed()}) exceeds maximum available (${totalAvailable.toFixed()}).`
    )
  }
  // Steps through levels and multiplies each incremental amount by the level price
  // Levels takes the form of [[ level, price ], ... ] as in [[ '100', '0.5' ], ... ]
  for (let i = 0; i < levels.length; i++) {
    let incrementalAmount
    if (totalAmount.gt(new BigNumber(levels[i][0]))) {
      incrementalAmount = new BigNumber(levels[i][0]).minus(previousLevel)
    } else {
      incrementalAmount = new BigNumber(totalAmount).minus(previousLevel)
    }
    totalCost = totalCost.plus(
      new BigNumber(incrementalAmount).multipliedBy(levels[i][1])
    )
    previousLevel = new BigNumber(levels[i][0])
    if (totalAmount.lt(previousLevel)) break
  }
  return totalCost.decimalPlaces(6).toFixed()
}

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
  if (!/(http|ws)s?:\/\//.test(locator)) {
    locator = `https://${locator}`
  }
  return url.parse(locator)
}

export function getEtherscanURL(chainId: number, hash: string): string {
  return `https://${etherscanDomains[chainId]}/tx/${hash}`
}

export function flattenObject(
  obj: any,
  propName = '',
  result = {}
): { [id: string]: string } {
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
