/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as ethUtil from 'ethereumjs-util'
import * as sigUtil from 'eth-sig-util'
import { ethers } from 'ethers'
import * as url from 'url'
import BigNumber from 'bignumber.js'
import {
  SECONDS_IN_DAY,
  ADDRESS_ZERO,
  DOMAIN_VERSION,
  DOMAIN_NAME,
  etherscanDomains,
} from '@airswap/constants'
import {
  UnsignedOrder,
  Order,
  Signature,
  Levels,
  Formula,
  EIP712,
} from '@airswap/typescript'

// eslint-disable-next-line  @typescript-eslint/explicit-module-boundary-types
export function createOrder({
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  nonce = Date.now().toString(),
  signerWallet = ADDRESS_ZERO,
  signerToken = ADDRESS_ZERO,
  signerAmount = '0',
  protocolFee = '0',
  senderWallet = ADDRESS_ZERO,
  senderToken = ADDRESS_ZERO,
  senderAmount = '0',
}: any): UnsignedOrder {
  return {
    expiry: String(expiry),
    nonce: String(nonce),
    signerWallet,
    signerToken,
    signerAmount: String(signerAmount),
    protocolFee: String(protocolFee),
    senderWallet,
    senderToken,
    senderAmount: String(senderAmount),
  }
}

export async function createSignature(
  unsignedOrder: UnsignedOrder,
  signer: ethers.VoidSigner | string,
  swapContract: string,
  chainId: number
): Promise<Signature> {
  let sig
  if (typeof signer === 'string') {
    sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(signer), {
      data: {
        types: EIP712,
        domain: {
          name: DOMAIN_NAME,
          version: DOMAIN_VERSION,
          chainId,
          verifyingContract: swapContract,
        },
        primaryType: 'Order',
        message: unsignedOrder,
      },
    })
  } else {
    sig = await signer._signTypedData(
      {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId,
        verifyingContract: swapContract,
      },
      { Order: EIP712.Order },
      unsignedOrder
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromSignature(
  order: UnsignedOrder,
  swapContract: string,
  chainId: number,
  v: string,
  r: string,
  s: string
): string {
  const sig = `${r}${s.slice(2)}${ethers.BigNumber.from(v)
    .toHexString()
    .slice(2)}`
  return sigUtil.recoverTypedSignature_v4({
    data: {
      types: EIP712,
      domain: {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId,
        verifyingContract: swapContract,
      },
      primaryType: 'Order',
      message: order,
    },
    sig,
  })
}

export function isValidOrder(order: Order): boolean {
  return (
    order &&
    'nonce' in order &&
    'expiry' in order &&
    'signerWallet' in order &&
    'signerToken' in order &&
    'signerAmount' in order &&
    'senderToken' in order &&
    'senderAmount' in order &&
    'r' in order &&
    's' in order &&
    'v' in order
  )
}

export function orderToParams(order: Order): Array<string> {
  return [
    order.nonce,
    order.expiry,
    order.signerWallet,
    order.signerToken,
    order.signerAmount,
    order.senderToken,
    order.senderAmount,
    order.v,
    order.r,
    order.s,
  ]
}

export function orderPropsToStrings(obj: any): Order {
  return {
    nonce: String(obj.nonce),
    expiry: String(obj.expiry),
    signerWallet: String(obj.signerWallet),
    signerToken: String(obj.signerToken),
    signerAmount: String(obj.signerAmount),
    senderToken: String(obj.senderToken),
    senderAmount: String(obj.senderAmount),
    v: String(obj.v),
    r: String(obj.r),
    s: String(obj.s),
  }
}

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

function getLowest(objects: Array<Order>, key: string): any {
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

function getHighest(objects: Array<Order>, key: string): any {
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

export function getBestByLowestSenderAmount(objects: Array<Order>): any {
  return getLowest(objects, 'sender')
}

export function getBestByLowestSignerAmount(objects: Array<Order>): any {
  return getLowest(objects, 'signer')
}

export function getBestByHighestSignerAmount(objects: Array<Order>): any {
  return getHighest(objects, 'signer')
}

export function getBestByHighestSenderAmount(objects: Array<Order>): any {
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

export function numberToBytes32(number: number): string {
  const hexString = number.toString(16)
  return `0x${hexString.padStart(64, '0')}`
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
