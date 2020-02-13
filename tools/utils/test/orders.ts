import { expect } from 'chai'

import {
  createOrder,
  getByLowestSenderAmount,
  getByHighestSignerAmount,
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
    const best = getByLowestSenderAmount(orders)
    expect(best.sender.amount).to.equal(String(lowestAmount))
  })

  it('Checks best order by highest signer', async () => {
    const orders = []
    const count = 5
    const highestAmount = 50
    for (let i = 0; i < count; i++) {
      orders.push(
        createOrder({
          sender: {
            wallet: '',
            kind: '',
            token: '',
            amount: String(i + highestAmount),
          },
        })
      )
    }
    const best = getByHighestSignerAmount(orders)
    expect(best.sender.amount).to.equal(String(highestAmount))
  })
})
