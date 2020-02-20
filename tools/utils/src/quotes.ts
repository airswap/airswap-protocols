import { BigNumber, bigNumberify } from 'ethers/utils'
import { Quote } from '@airswap/types'
import { tokenKinds } from '@airswap/constants'
import { getTimestamp } from '..'

export function createQuote(
  signerAmount: string,
  signerToken: string,
  senderAmount: string,
  senderToken: string,
  protocol?: string,
  locator?: string,
  signerKind = tokenKinds.ERC20,
  signerID = '',
  senderKind = tokenKinds.ERC20,
  senderID = ''
): Quote {
  return {
    timestamp: getTimestamp(),
    protocol,
    locator,
    signer: {
      kind: signerKind,
      token: signerToken,
      amount: signerAmount,
      id: signerID,
    },
    sender: {
      kind: senderKind,
      token: senderToken,
      amount: senderAmount,
      id: senderID,
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
