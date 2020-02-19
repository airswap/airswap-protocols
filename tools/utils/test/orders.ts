import { expect } from 'chai'

import {
  createOrder,
  getBestByLowestSenderAmount,
  getBestByHighestSignerAmount,
} from '../index'

describe('Orders', async () => {
  it('Best by lowest sender', async () => {
    const orders = []
    let count = 5
    const lowestAmount = 50
    while (count--) {
      orders.push(
        createOrder({
          sender: {
            wallet: '',
            kind: '',
            token: '',
            amount: String(count + lowestAmount),
          },
        })
      )
    }
    const best = getBestByLowestSenderAmount(orders)
    expect(best.sender.amount).to.equal(String(lowestAmount))
  })

  it('Best by highest signer', async () => {
    const orders = []
    const highestAmount = 5
    let count = 0
    while (count++ < highestAmount) {
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
