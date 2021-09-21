import { ethers } from 'ethers'
import { Quote, emptyParty } from '@airswap/types'
import { lowerCaseAddresses } from '..'

// eslint-disable-next-line  @typescript-eslint/explicit-module-boundary-types
export function createQuote({ signer = {}, sender = {} }: any): Quote {
  return lowerCaseAddresses({
    signer: { ...emptyParty, ...signer },
    sender: { ...emptyParty, ...sender },
  })
}

export function isValidQuote(quote: Quote): boolean {
  if (
    quote &&
    'signer' in quote &&
    'sender' in quote &&
    'kind' in quote['signer'] &&
    'kind' in quote['sender'] &&
    'token' in quote['signer'] &&
    'token' in quote['sender'] &&
    'amount' in quote['signer'] &&
    'amount' in quote['sender'] &&
    'id' in quote['signer'] &&
    'id' in quote['sender']
  ) {
    return true
  }
  return false
}

export function getTotalBySignerAmount(quotes: Array<Quote>): ethers.BigNumber {
  let total = ethers.BigNumber.from(0)
  for (const order of quotes) {
    total = ethers.BigNumber.from(order.signer.amount).add(total)
  }
  return total
}

export function getTotalBySenderAmount(quotes: Array<Quote>): ethers.BigNumber {
  let total = ethers.BigNumber.from(0)
  for (const order of quotes) {
    total = ethers.BigNumber.from(order.sender.amount).add(total)
  }
  return total
}
