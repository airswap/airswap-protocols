import { assert, expect } from 'chai'
import { ethers } from 'ethers'
import { ADDRESS_ZERO, SECONDS_IN_DAY } from '@airswap/constants'
import { Levels, FullOrderERC20 } from '@airswap/typescript'

import {
  isValidFullOrderERC20,
  isValidOrderERC20,
  isValidClaim,
  calculateCostFromLevels,
  createOrderERC20Signature,
  createClaimSignature,
  getSignerFromOrderERC20Signature,
  getSignerFromClaimSignature,
  compressFullOrderERC20,
  decompressFullOrderERC20,
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
    const { v, r, s } = await createOrderERC20Signature(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromOrderERC20Signature(
      unsignedOrder,
      ADDRESS_ZERO,
      1,
      v,
      r,
      s
    )
    expect(isValidOrderERC20({ ...unsignedOrder, v, r, s })).to.equal(true)
    expect(signerWallet.toLowerCase()).to.equal(wallet.address.toLowerCase())
  })

  it('isValidFullOrder : returns true only if fields are present', async () => {
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
    const signature = await createOrderERC20Signature(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromOrderERC20Signature(
      unsignedOrder,
      ADDRESS_ZERO,
      1,
      signature.v,
      signature.r,
      signature.s
    )
    const settlement = {
      chainId: 4,
      swapContract: '0x3700A8C0447aEE3160F6aF3A34a0C062629335d9',
    }

    expect(
      isValidFullOrderERC20(undefined as unknown as FullOrderERC20)
    ).to.equal(false)
    expect(isValidFullOrderERC20(null as unknown as FullOrderERC20)).to.equal(
      false
    )
    expect(isValidFullOrderERC20({} as unknown as FullOrderERC20)).to.equal(
      false
    )
    expect(
      isValidFullOrderERC20(unsignedOrder as unknown as FullOrderERC20)
    ).to.equal(false)
    expect(
      isValidFullOrderERC20({
        ...unsignedOrder,
        ...signature,
      } as unknown as FullOrderERC20)
    ).to.equal(false)
    expect(
      isValidFullOrderERC20({
        ...unsignedOrder,
        ...signature,
        signerWallet,
        ...settlement,
      })
    ).to.equal(true)
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
    const { v, r, s } = await createOrderERC20Signature(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromOrderERC20Signature(
      unsignedOrder,
      ADDRESS_ZERO,
      1,
      v,
      r,
      s
    )
    const chainId = 1
    const swapContract = ADDRESS_ZERO
    const compressed = compressFullOrderERC20({
      chainId,
      swapContract,
      ...unsignedOrder,
      v,
      r,
      s,
    })
    const signedOrder = decompressFullOrderERC20(compressed)
    expect(isValidOrderERC20(signedOrder)).to.equal(true)
    expect(signerWallet.toLowerCase()).to.equal(wallet.address.toLowerCase())
  })
})
