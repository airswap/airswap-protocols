import { assert, expect } from 'chai'
import { ethers } from 'ethers'
import { ADDRESS_ZERO, SECONDS_IN_DAY } from '@airswap/constants'
import { Levels } from '@airswap/typescript'

import {
  isValidOrder,
  isValidClaim,
  calculateCostFromLevels,
  createSwapSignature,
  createClaimSignature,
  getSignerFromSwapSignature,
  getSignerFromClaimSignature,
  compressOrder,
  decompressOrder,
} from '../index'

const signerPrivateKey =
  '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
const provider = ethers.getDefaultProvider('goerli')
const wallet = new ethers.Wallet(signerPrivateKey, provider)

describe('Utils', async () => {
  let unsignedOrder
  before(async () => {
    unsignedOrder = {
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
  })

  it('Signs and validates an order', async () => {
    const { v, r, s } = await createSwapSignature(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromSwapSignature(
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

  it('Signs and validates a claim', async () => {
    const unsignedClaim = {
      nonce: Date.now().toString(),
      expiry: Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
      participant: ADDRESS_ZERO,
      score: '300',
    }
    const { v, r, s } = await createClaimSignature(
      unsignedClaim,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromClaimSignature(
      unsignedClaim,
      ADDRESS_ZERO,
      1,
      v,
      r,
      s
    )
    expect(isValidClaim({ ...unsignedClaim, v, r, s })).to.equal(true)
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

  it('Compresses and decompresses an order', async () => {
    const { v, r, s } = await createSwapSignature(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromSwapSignature(
      unsignedOrder,
      ADDRESS_ZERO,
      1,
      v,
      r,
      s
    )
    const compressed = compressOrder({ ...unsignedOrder, v, r, s })
    const signedOrder = decompressOrder(compressed)
    expect(isValidOrder(signedOrder)).to.equal(true)
    expect(signerWallet.toLowerCase()).to.equal(wallet.address.toLowerCase())
  })
})
