import { expect } from 'chai'

import {
  createQuote,
  isValidQuote,
  getTotalBySignerAmount,
  getTotalBySenderAmount,
} from '../index'

describe('Quotes', async () => {
  it('Creates and validates a quote', async () => {
    const quote = createQuote({})
    expect(isValidQuote(quote)).to.equal(true)
  })

  it('Total by signer amount', async () => {
    const quotes = []
    let amount = 0
    for (let i = 0; i < 100; i++) {
      quotes.push(
        createQuote({
          signer: {
            amount: String(i),
          },
        })
      )
      amount += i
    }
    expect(getTotalBySignerAmount(quotes).toString()).to.equal(String(amount))
  })

  it('Total by sender amount', async () => {
    const quotes = []
    let amount = 0
    for (let i = 0; i < 100; i++) {
      quotes.push(
        createQuote({
          sender: {
            amount: String(i),
          },
        })
      )
      amount += i
    }
    expect(getTotalBySenderAmount(quotes).toString()).to.equal(String(amount))
  })
})
