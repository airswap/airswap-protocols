import { expect } from 'chai'
import { functions } from '@airswap/test-utils'
import { ADDRESS_ZERO, tokenKinds } from '@airswap/constants'

import {
  createOrder,
  signOrder,
  isValidOrder,
  getBestByLowestSenderAmount,
  getBestByHighestSignerAmount,
} from '../index'
import {
  createLightOrder,
  createLightSignature,
  getSignerFromLightSignature,
} from '../src/orders'

const wallet = functions.getTestWallet()

describe('Orders', async () => {
  it('Signs and validates an order', async () => {
    const unsignedOrder = createOrder({
      signer: {
        wallet: wallet.address,
      },
    })
    const order = await signOrder(unsignedOrder, wallet, ADDRESS_ZERO)
    expect(isValidOrder(order)).to.equal(true)
  })

  it('Signs and validates a light order', async () => {
    const order = createLightOrder({})
    const signature = await createLightSignature(order, wallet)
    const signerWallet = getSignerFromLightSignature(order, signature)
    expect(signerWallet).to.equal(wallet.address)
  })

  it('Best by lowest sender', async () => {
    const orders = []
    let count = 5
    const lowestAmount = 50
    while (count--) {
      orders.push(
        createOrder({
          sender: {
            wallet: '',
            kind: tokenKinds.ERC20,
            token: '',
            amount: count + lowestAmount,
          },
        })
      )
    }
    const best = getBestByLowestSenderAmount(orders)
    expect(parseInt(best.sender.data.slice(2), 16)).to.equal(lowestAmount)
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
            kind: tokenKinds.ERC20,
            token: '',
            amount: count,
          },
        })
      )
    }
    const best = getBestByHighestSignerAmount(orders)
    expect(parseInt(best.signer.data.slice(2), 16)).to.equal(highestAmount)
  })
})
