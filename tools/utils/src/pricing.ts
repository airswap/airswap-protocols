import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'

export type Levels = [string, string][]

export type Formula = string

type LevelsOrFomulae =
  | {
      bid: Levels
      ask: Levels
    }
  | {
      bid: Formula
      ask: Formula
    }

export type Pricing = {
  baseToken: string
  quoteToken: string
  minimum?: string
} & LevelsOrFomulae

export function isValidPricingERC20(pricing: Pricing[]): boolean {
  if (!pricing || !pricing.length) return false
  let length = pricing.length
  while (length--) {
    if (!isValidPricingERC20Pair(pricing[length])) return false
  }
  return true
}

export function isValidPricingERC20Pair(pricing: Pricing): boolean {
  return (
    !!pricing &&
    ethers.utils.isAddress(pricing.baseToken) &&
    ethers.utils.isAddress(pricing.quoteToken) &&
    !!pricing.bid &&
    !!pricing.ask &&
    !!pricing.bid.length &&
    !!pricing.ask.length &&
    pricing.bid[0].length === 2 &&
    pricing.ask[0].length === 2 &&
    typeof pricing.ask[0][0] === 'string' &&
    typeof pricing.ask[0][1] === 'string'
  )
}

export function getPriceForAmount(
  side: 'buy' | 'sell',
  amount: string,
  baseToken: string,
  quoteToken: string,
  pricing: Pricing[]
) {
  for (const i in pricing) {
    if (pricing[i].baseToken.toLowerCase() === baseToken.toLowerCase()) {
      if (pricing[i].quoteToken.toLowerCase() === quoteToken.toLowerCase()) {
        if (
          pricing[i].minimum &&
          BigNumber(amount).lt(pricing[i].minimum || 0)
        ) {
          throw new Error(
            `Requested amount ${amount} does not meet minimum ${pricing[i].minimum}`
          )
        }
        if (side === 'buy') {
          return calculateCost(amount, pricing[i].ask)
        }
        return calculateCost(amount, pricing[i].bid)
      }
    }
  }
  throw new Error(
    `Requested pair ${quoteToken}/${baseToken} not found in provided pricing`
  )
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
    let incrementalAmount: BigNumber
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
