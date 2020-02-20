import { expect } from 'chai'

import {
  createQuote,
  getTotalBySignerAmount,
  getTotalBySenderAmount,
} from '../index'

describe('Quotes', async () => {
  it('Total by signer amount', async () => {
    const quotes = []
    let amount = 0
    for (let i = 0; i < 100; i++) {
      quotes.push(createQuote(String(i), '', String(0), ''))
      amount += i
    }
    expect(getTotalBySignerAmount(quotes).toString()).to.equal(String(amount))
  })

  it('Total by sender amount', async () => {
    const quotes = []
    let amount = 0
    for (let i = 0; i < 100; i++) {
      quotes.push(createQuote(String(0), '', String(i), ''))
      amount += i
    }
    expect(getTotalBySenderAmount(quotes).toString()).to.equal(String(amount))
  })
})
