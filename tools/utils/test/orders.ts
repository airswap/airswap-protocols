import { expect } from 'chai'
import { functions } from '@airswap/test-utils'
import { ADDRESS_ZERO, SECONDS_IN_DAY, tokenKinds } from '@airswap/constants'

import {
  createOrder,
  signOrder,
  isValidOrder,
  isValidLightOrder,
  getBestByLowestSenderAmount,
  getBestByHighestSignerAmount,
} from '../index'
import {
  createLightSignature,
  signTypedDataOrder,
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

  it('Signs with typed data and validates an order', async () => {
    const unsignedOrder = createOrder({
      signer: {
        wallet: wallet.address,
      },
    })
    const order = await signTypedDataOrder(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO
    )
    expect(isValidOrder(order)).to.equal(true)
  })

  it('Signs and validates a light order', async () => {
    const unsignedOrder = {
      nonce: Date.now().toString(),
      expiry: Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
      signerWallet: ADDRESS_ZERO,
      signerToken: ADDRESS_ZERO,
      signerAmount: '0',
      signerFee: '300',
      senderWallet: ADDRESS_ZERO,
      senderToken: ADDRESS_ZERO,
      senderAmount: '0',
    }
    const { v, r, s } = await createLightSignature(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromLightSignature(
      unsignedOrder,
      ADDRESS_ZERO,
      1,
      v,
      r,
      s
    )
    expect(isValidLightOrder({ ...unsignedOrder, v, r, s })).to.equal(true)
    expect(signerWallet.toLowerCase()).to.equal(wallet.address.toLowerCase())
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
            kind: tokenKinds.ERC20,
            token: '',
            amount: count,
          },
        })
      )
    }
    const best = getBestByHighestSignerAmount(orders)
    expect(best.signer.amount).to.equal(String(highestAmount))
  })
})
