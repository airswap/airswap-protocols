import { assert, expect } from 'chai'
import { ethers } from 'ethers'
import { ADDRESS_ZERO, SECONDS_IN_DAY } from '@airswap/constants'
import { Levels } from '@airswap/typescript'

import {
  isValidOrder,
  calculateCostFromLevels,
  createSignature,
  getSignerFromSignature,
} from '../index'

const signerPrivateKey =
  '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
const provider = ethers.getDefaultProvider('rinkeby')
const wallet = new ethers.Wallet(signerPrivateKey, provider)

describe('Utils', async () => {
  it('Signs and validates an order', async () => {
    const unsignedOrder = {
      nonce: Date.now().toString(),
      expiry: Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
      signerWallet: ADDRESS_ZERO,
      signerToken: ADDRESS_ZERO,
      signerAmount: '0',
      protocolFee: '300',
      senderWallet: ADDRESS_ZERO,
      senderToken: ADDRESS_ZERO,
      senderAmount: '0',
    }
    const { v, r, s } = await createSignature(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromSignature(
      unsignedOrder,
      ADDRESS_ZERO,
      1,
      v,
      r,
      s
    )
    expect(isValidOrder({ ...unsignedOrder, v, r, s })).to.equal(true)
    expect(signerWallet.toLowerCase()).to.equal(wallet.address.toLowerCase())
  })

  const levels: Levels = [
    ['250', '0.5'],
    ['500', '0.6'],
    ['750', '0.7'],
  ]

  it('Calculates cost from levels', async () => {
    expect(calculateCostFromLevels('200', levels)).to.equal('100')
    expect(calculateCostFromLevels('250', levels)).to.equal('125')
    expect(calculateCostFromLevels('255', levels)).to.equal('128')
    expect(calculateCostFromLevels('600', levels)).to.equal('345')
  })

  it('Throws for amount over max', async () => {
    try {
      calculateCostFromLevels('755', levels)
      assert(false)
    } catch (e) {
      assert(true)
    }
  })
})
