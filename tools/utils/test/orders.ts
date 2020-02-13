import { expect } from 'chai'

import {
  createOrder,
  getBestByLowestSenderAmount,
  getBestByHighestSignerAmount,
} from '../src/orders'

describe('Orders', async () => {
  it('Checks best order by lowest sender', async () => {
    const orders = []
    let i = 5
    const lowestAmount = 50
    while (i--) {
      orders.push(
        createOrder({
          sender: {
            wallet: '',
            kind: '',
            token: '',
            amount: String(i + lowestAmount),
          },
        })
      )
    }
    const best = getBestByLowestSenderAmount(orders)
    expect(best.sender.amount).to.equal(String(lowestAmount))
  })

  it('Checks best order by highest signer', async () => {
    const orders = []
    const highestAmount = 5
    let count = -1
    for (; count <= highestAmount; ++count) {
      orders.push(
        createOrder({
          signer: {
            wallet: '',
            kind: '',
            token: '',
            amount: String(count),
          },
        })
      )
    }
    const best = getBestByHighestSignerAmount(orders)
    expect(best.signer.amount).to.equal(String(highestAmount))
  })
})
