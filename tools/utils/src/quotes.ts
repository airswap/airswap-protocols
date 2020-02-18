import { BigNumber, bigNumberify } from 'ethers/utils'
import { Quote } from '@airswap/types'

export function createQuote(
  signerToken: string,
  signerAmount: string,
  senderToken: string,
  senderAmount: string
): Quote {
  return {
    signer: {
      token: signerToken,
      amount: signerAmount,
    },
    sender: {
      token: senderToken,
      amount: senderAmount,
    },
  }
}

export function getTotalBySignerAmount(quotes: Array<Quote>): BigNumber {
  let total = new BigNumber(0)
  for (const order of quotes) {
    total = bigNumberify(order.signer.amount).add(total)
  }
  return total
}

export function getTotalBySenderAmount(quotes: Array<Quote>): BigNumber {
  let total = new BigNumber(0)
  for (const order of quotes) {
    total = bigNumberify(order.sender.amount).add(total)
  }
  return total
}
