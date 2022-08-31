/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as ethUtil from 'ethereumjs-util'
import * as sigUtil from 'eth-sig-util'
import { ethers } from 'ethers'
import * as url from 'url'
import BigNumber from 'bignumber.js'
import lzString from 'lz-string'

import {
  SECONDS_IN_DAY,
  ADDRESS_ZERO,
  DOMAIN_VERSION_SWAP,
  DOMAIN_NAME_SWAP,
  DOMAIN_VERSION_POOL,
  DOMAIN_NAME_POOL,
  etherscanDomains,
} from '@airswap/constants'
import {
  UnsignedOrder,
  Order,
  FullOrder,
  UnsignedClaim,
  Claim,
  Signature,
  Levels,
  Formula,
  Pricing,
  EIP712Swap,
  EIP712Claim,
} from '@airswap/typescript'

function stringify(
  types: { [key: string]: { type: string; name: string }[] },
  primaryType: string
): string {
  return types[primaryType].reduce((str, value, index, values) => {
    const isEnd = index !== values.length - 1
    return str + `${value.type} ${value.name}${isEnd ? ',' : ')'}`
  }, `${primaryType}(`)
}

export const EIP712_DOMAIN_TYPEHASH = ethUtil.keccak256(
  stringify(EIP712Swap, 'EIP712Domain')
)
export const ORDER_TYPEHASH = ethUtil.keccak256(stringify(EIP712Swap, 'Order'))

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

export async function createSwapSignature(
  unsignedOrder: UnsignedOrder,
  signer: ethers.VoidSigner | string,
  swapContract: string,
  chainId: number
): Promise<Signature> {
  let sig
  if (typeof signer === 'string') {
    sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(signer), {
      data: {
        types: EIP712Swap,
        domain: {
          name: DOMAIN_NAME_SWAP,
          version: DOMAIN_VERSION_SWAP,
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
        name: DOMAIN_NAME_SWAP,
        version: DOMAIN_VERSION_SWAP,
        chainId,
        verifyingContract: swapContract,
      },
      { Order: EIP712Swap.Order },
      unsignedOrder
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromSwapSignature(
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
      types: EIP712Swap,
      domain: {
        name: DOMAIN_NAME_SWAP,
        version: DOMAIN_VERSION_SWAP,
        chainId,
        verifyingContract: swapContract,
      },
      primaryType: 'Order',
      message: order,
    },
    sig,
  })
}

export function hashOrder(order: UnsignedOrder): Buffer {
  return ethUtil.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        'bytes32',
        'uint256',
        'uint256',
        'address',
        'address',
        'uint256',
        'uint256',
        'address',
        'address',
        'uint256',
      ],
      [
        ORDER_TYPEHASH,
        order.nonce,
        order.expiry,
        order.signerWallet,
        order.signerToken,
        order.signerAmount,
        order.protocolFee,
        order.senderWallet,
        order.senderToken,
        order.senderAmount,
      ]
    )
  )
}

export function hashDomain(swapContract: string): Buffer {
  return ethUtil.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'address'],
      [
        EIP712_DOMAIN_TYPEHASH,
        ethUtil.keccak256(DOMAIN_NAME_SWAP),
        ethUtil.keccak256(DOMAIN_VERSION_SWAP),
        swapContract,
      ]
    )
  )
}

export function getOrderHash(
  order: UnsignedOrder,
  swapContract: string
): Buffer {
  return ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      hashDomain(swapContract),
      hashOrder(order),
    ])
  )
}

export function isValidOrder(order: Order): boolean {
  return (
    !!order &&
    typeof order['nonce'] == 'string' &&
    typeof order['expiry'] == 'string' &&
    ethers.utils.isAddress(order['signerWallet']) &&
    ethers.utils.isAddress(order['signerToken']) &&
    typeof order['signerAmount'] == 'string' &&
    ethers.utils.isAddress(order['senderToken']) &&
    typeof order['senderAmount'] == 'string' &&
    typeof order['v'] == 'string' &&
    ethers.utils.isBytesLike(order['r']) &&
    ethers.utils.isBytesLike(order['s'])
  )
}

export function isValidFullOrder(fullOrder: FullOrder): boolean {
  return (
    !!fullOrder &&
    ethers.utils.isAddress(fullOrder['swapContract']) &&
    typeof fullOrder['chainId'] == 'string' &&
    typeof fullOrder['nonce'] == 'string' &&
    typeof fullOrder['expiry'] == 'string' &&
    ethers.utils.isAddress(fullOrder['signerWallet']) &&
    ethers.utils.isAddress(fullOrder['signerToken']) &&
    typeof fullOrder['signerAmount'] == 'string' &&
    typeof fullOrder['protocolFee'] == 'string' &&
    ethers.utils.isAddress(fullOrder['senderWallet']) &&
    ethers.utils.isAddress(fullOrder['senderToken']) &&
    typeof fullOrder['senderAmount'] == 'string' &&
    typeof fullOrder['v'] == 'string' &&
    ethers.utils.isBytesLike(fullOrder['r']) &&
    ethers.utils.isBytesLike(fullOrder['s'])
  )
}

export function orderToParams(
  order: Order
): [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
] {
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

export function paramsToOrder(str: string): Order {
  const split = str.split(',')
  return {
    nonce: split[0],
    expiry: split[1],
    signerWallet: split[2],
    signerToken: split[3],
    signerAmount: split[4],
    senderToken: split[5],
    senderAmount: split[6],
    v: split[7],
    r: split[8],
    s: split[9],
  }
}

export function fullOrderToParams(
  order: FullOrder
): [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
] {
  return [
    order.chainId,
    order.swapContract,
    order.nonce,
    order.expiry,
    order.signerWallet,
    order.signerToken,
    order.signerAmount,
    order.protocolFee,
    order.senderWallet,
    order.senderToken,
    order.senderAmount,
    order.v,
    order.r,
    order.s,
  ]
}

export function paramsToFullOrder(str: string): FullOrder {
  const split = str.split(',')
  return {
    chainId: split[0],
    swapContract: split[1],
    nonce: split[2],
    expiry: split[3],
    signerWallet: split[4],
    signerToken: split[5],
    signerAmount: split[6],
    protocolFee: split[7],
    senderWallet: split[8],
    senderToken: split[9],
    senderAmount: split[10],
    v: split[11],
    r: split[12],
    s: split[13],
  }
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

export function compressFullOrder(order: FullOrder): string {
  return lzString.compressToEncodedURIComponent(
    fullOrderToParams(order).join(',')
  )
}

export function decompressFullOrder(str: string): FullOrder {
  return paramsToFullOrder(lzString.decompressFromEncodedURIComponent(str))
}

// eslint-disable-next-line  @typescript-eslint/explicit-module-boundary-types
export function createClaim({
  nonce = Date.now().toString(),
  expiry = nonce + 60,
  participant = ADDRESS_ZERO,
  score = '0',
}: any): UnsignedClaim {
  return {
    nonce: String(nonce),
    expiry: String(expiry),
    participant,
    score: String(score),
  }
}

export async function createClaimSignature(
  unsignedClaim: UnsignedClaim,
  signer: ethers.VoidSigner | string,
  poolContract: string,
  chainId: number
): Promise<Signature> {
  let sig
  if (typeof signer === 'string') {
    sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(signer), {
      data: {
        types: EIP712Claim,
        domain: {
          name: DOMAIN_NAME_POOL,
          version: DOMAIN_VERSION_POOL,
          chainId,
          verifyingContract: poolContract,
        },
        primaryType: 'Claim',
        message: unsignedClaim,
      },
    })
  } else {
    sig = await signer._signTypedData(
      {
        name: DOMAIN_NAME_POOL,
        version: DOMAIN_VERSION_POOL,
        chainId,
        verifyingContract: poolContract,
      },
      { Claim: EIP712Claim.Claim },
      unsignedClaim
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromClaimSignature(
  claim: UnsignedClaim,
  poolContract: string,
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
      types: EIP712Claim,
      domain: {
        name: DOMAIN_NAME_POOL,
        version: DOMAIN_VERSION_POOL,
        chainId,
        verifyingContract: poolContract,
      },
      primaryType: 'Claim',
      message: claim,
    },
    sig,
  })
}

export function isValidClaim(claim: Claim): boolean {
  return (
    claim &&
    'nonce' in claim &&
    'expiry' in claim &&
    'participant' in claim &&
    'score' in claim &&
    'r' in claim &&
    's' in claim &&
    'v' in claim
  )
}

export function claimToParams(claim: Claim): Array<string> {
  return [
    claim.nonce,
    claim.expiry,
    claim.participant,
    claim.score,
    claim.v,
    claim.r,
    claim.s,
  ]
}

export function claimPropsToStrings(obj: any): Claim {
  return {
    nonce: String(obj.nonce),
    expiry: String(obj.expiry),
    participant: String(obj.participant),
    score: String(obj.score),
    v: String(obj.v),
    r: String(obj.r),
    s: String(obj.s),
  }
}

export function getCostFromPricing(
  side: 'buy' | 'sell',
  amount: string,
  baseToken: string,
  quoteToken: string,
  pricing: Pricing[]
) {
  for (const i in pricing) {
    if (pricing[i].baseToken.toLowerCase() === baseToken.toLowerCase()) {
      if (pricing[i].quoteToken.toLowerCase() === quoteToken.toLowerCase()) {
        if (side === 'buy') {
          return calculateCost(amount, pricing[i].ask)
        }
        return calculateCost(amount, pricing[i].bid)
      }
    }
  }
  return null
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

export function getEtherscanWalletURL(
  chainId: number,
  address: string
): string {
  return `https://${etherscanDomains[chainId]}/address/${address}`
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
