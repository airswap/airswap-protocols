import { assert, expect } from 'chai'
import { ethers } from 'ethers'
import { FullOrderERC20, Levels, UnsignedOrderERC20 } from '../index'

import {
  ADDRESS_ZERO,
  SECONDS_IN_DAY,
  calculateCostFromLevels,
  compressFullOrderERC20,
  createOrderERC20Signature,
  decompressFullOrderERC20,
  getFullSwapERC20,
  getInterfaceId,
  getSignerFromOrderERC20Signature,
  isValidFullOrderERC20,
  isValidOrderERC20,
  isValidPricingERC20,
  protocolInterfaces,
  calculateDelegateFillSignerAmount,
} from '../index'

const signerPrivateKey =
  '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
const wallet = new ethers.Wallet(signerPrivateKey)

describe('Protocols', async () => {
  it('InterfaceIds are correct', async () => {
    for (const interfaceId in protocolInterfaces) {
      expect(getInterfaceId(protocolInterfaces[interfaceId])).to.be.equal(
        interfaceId
      )
    }
  })
})

describe('Utils', async () => {
  let unsignedOrder: UnsignedOrderERC20
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

  it('Generates correct interfaceIds', async () => {
    for (const interfaceId in protocolInterfaces) {
      expect(getInterfaceId(protocolInterfaces[interfaceId])).to.be.equal(
        interfaceId
      )
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

  it('checks isValidFullOrder', async () => {
    const unsignedOrder: UnsignedOrderERC20 = {
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

  const levels: Levels = [
    ['250', '0.5'],
    ['500', '0.6'],
    ['750', '0.7'],
  ]

  it('checks isValidPricingERC20', async () => {
    expect(
      isValidPricingERC20([
        {
          baseToken: ADDRESS_ZERO,
          quoteToken: ADDRESS_ZERO,
          bid: levels,
          ask: levels,
        },
      ])
    ).to.be.true
  })

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

  it('Gets full SwapERC20 from signerWallet and logs', async () => {
    const nonce = '1'
    const signerWallet = '0x51c72848c68a965f66fa7a88855f9f7784502a7f'
    const feeReceiver = '0xaD30f7EEBD9Bd5150a256F47DA41d4403033CdF0'
    const fullSwap = await getFullSwapERC20(
      nonce,
      signerWallet,
      feeReceiver,
      require('./test-logs.json')
    )
    expect(fullSwap).to.deep.equal({
      nonce,
      signerWallet,
      signerToken: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      signerAmount: '1008438461',
      senderWallet: '0x74de5d4fcbf63e00296fd95d33236b9794016631',
      senderToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      senderAmount: '461545050000000000',
      feeAmount: '705906',
    })
  })

  describe('Delegate calculations', () => {
    it('calculates correct signer amount for simple delegate fill', async () => {
      // Test with different decimals (6 vs 18)
      expect(
        calculateDelegateFillSignerAmount(
          '500000', // fillSenderAmount (0.5 USDC)
          '1000000', // ruleSenderAmount (1 USDC)
          '1000000000000000000' // ruleSignerAmount (1 ETH)
        )
      ).to.equal('500000000000000000') // Should get 0.5 ETH
    })

    it('calculates correct signer amount with rounding and different decimals', async () => {
      // Rule amounts: 1.1 USDC (6 decimals) to 1.6 ETH (18 decimals)
      const senderRuleAmount = '1100000' // 1.1 USDC
      const signerRuleAmount = '1600000000000000000' // 1.6 ETH

      // Calculate partial fill (10/220 ratio)
      // 1100000 * 10 / 220 = 50000 (0.05 USDC)
      const fillSenderAmount = (
        (BigInt(senderRuleAmount) * BigInt(10)) /
        BigInt(220)
      ).toString()

      // Calculate expected signer amount using the same integer division as the contract
      const expectedSignerAmount = (
        (BigInt(signerRuleAmount) * BigInt(fillSenderAmount)) /
        BigInt(senderRuleAmount)
      ).toString()

      // Should get 0.072727272727272727 ETH
      expect(
        calculateDelegateFillSignerAmount(
          fillSenderAmount,
          senderRuleAmount,
          signerRuleAmount
        )
      ).to.equal(expectedSignerAmount)

      // Verify the exact value we expect
      expect(expectedSignerAmount).to.equal('72727272727272727')
    })
  })
})
