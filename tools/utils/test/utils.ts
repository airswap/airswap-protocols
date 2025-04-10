import { assert, expect } from 'chai'
import { ethers } from 'ethers'
import { FullOrderERC20, Levels, UnsignedOrderERC20 } from '../index'

import {
  ADDRESS_ZERO,
  SECONDS_IN_DAY,
  getCostByLevels,
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
  createOrder,
  createOrderSignature,
  fullOrderToParams,
  compressFullOrder,
  decompressFullOrder,
  orderToParams,
  getCostByRule,
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

  describe('SwapERC20', () => {
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

    it('checks isValidFullOrderERC20', async () => {
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
      expect(getCostByLevels('200', levels)).to.equal('100')
      expect(getCostByLevels('250', levels)).to.equal('125')
      expect(getCostByLevels('255', levels)).to.equal('128')
      expect(getCostByLevels('600', levels)).to.equal('345')
    })

    it('Throws for amount over max', async () => {
      try {
        getCostByLevels('755', levels)
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
  })

  describe('Swap', () => {
    it('Converts full order to params array correctly', async () => {
      // Create an unsigned order
      const unsignedOrder = createOrder({
        nonce: 1234567890,
        expiry: '1234567890',
        protocolFee: 300,
        signer: {
          wallet: '0x1234567890123456789012345678901234567890',
          token: '0x2234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '0',
          amount: '1000000',
        },
        sender: {
          wallet: '0x3234567890123456789012345678901234567890',
          token: '0x4234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '1',
          amount: '2000000',
        },
        affiliateWallet: '0x5234567890123456789012345678901234567890',
        affiliateAmount: 5000,
      })

      // Create signature
      const signature = await createOrderSignature(
        unsignedOrder,
        wallet.privateKey,
        ADDRESS_ZERO,
        1
      )

      // Create full order
      const fullOrder = {
        ...unsignedOrder,
        ...signature,
        chainId: 1,
        swapContract: ADDRESS_ZERO,
      }

      // Convert to params
      const params = fullOrderToParams(fullOrder)

      // Verify params array
      expect(params).to.deep.equal([
        1, // chainId
        ADDRESS_ZERO, // swapContract
        '1234567890', // nonce
        '1234567890', // expiry
        '300', // protocolFee
        '0x1234567890123456789012345678901234567890', // signer.wallet
        '0x2234567890123456789012345678901234567890', // signer.token
        '0x36372b07', // signer.kind
        '0', // signer.id
        '1000000', // signer.amount
        '0x3234567890123456789012345678901234567890', // sender.wallet
        '0x4234567890123456789012345678901234567890', // sender.token
        '0x36372b07', // sender.kind
        '1', // sender.id
        '2000000', // sender.amount
        '0x5234567890123456789012345678901234567890', // affiliateWallet
        '5000', // affiliateAmount
        signature.v, // v
        signature.r, // r
        signature.s, // s
      ])

      // Verify array length
      expect(params.length).to.equal(20)
    })

    it('Compresses and decompresses a full order correctly', async () => {
      // Create an unsigned order
      const unsignedOrder = createOrder({
        nonce: 1234567890,
        expiry: '1234567890',
        protocolFee: 300,
        signer: {
          wallet: '0x1234567890123456789012345678901234567890',
          token: '0x2234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '0',
          amount: '1000000',
        },
        sender: {
          wallet: '0x3234567890123456789012345678901234567890',
          token: '0x4234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '1',
          amount: '2000000',
        },
        affiliateWallet: '0x5234567890123456789012345678901234567890',
        affiliateAmount: 5000,
      })

      // Create signature
      const signature = await createOrderSignature(
        unsignedOrder,
        wallet.privateKey,
        ADDRESS_ZERO,
        1
      )

      // Create full order
      const fullOrder = {
        ...unsignedOrder,
        ...signature,
        chainId: 1,
        swapContract: ADDRESS_ZERO,
      }

      // Compress and then decompress
      const compressed = compressFullOrder(fullOrder)
      const decompressed = decompressFullOrder(compressed)

      // Verify the decompressed order matches the original
      expect(decompressed).to.deep.equal(fullOrder)
    })

    it('Converts order to params array correctly', async () => {
      // Create an unsigned order
      const unsignedOrder = createOrder({
        nonce: 1234567890,
        expiry: '1234567890',
        protocolFee: 300,
        signer: {
          wallet: '0x1234567890123456789012345678901234567890',
          token: '0x2234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '0',
          amount: '1000000',
        },
        sender: {
          wallet: '0x3234567890123456789012345678901234567890',
          token: '0x4234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '1',
          amount: '2000000',
        },
        affiliateWallet: '0x5234567890123456789012345678901234567890',
        affiliateAmount: 5000,
      })

      // Create signature
      const signature = await createOrderSignature(
        unsignedOrder,
        wallet.privateKey,
        ADDRESS_ZERO,
        1
      )

      // Create order
      const order = {
        ...unsignedOrder,
        ...signature,
      }

      // Convert to params
      const params = orderToParams(order)

      // Verify params array
      expect(params).to.deep.equal([
        '1234567890', // nonce
        '1234567890', // expiry
        '300', // protocolFee
        '0x1234567890123456789012345678901234567890', // signer.wallet
        '0x2234567890123456789012345678901234567890', // signer.token
        '0x36372b07', // signer.kind
        '0', // signer.id
        '1000000', // signer.amount
        '0x3234567890123456789012345678901234567890', // sender.wallet
        '0x4234567890123456789012345678901234567890', // sender.token
        '0x36372b07', // sender.kind
        '1', // sender.id
        '2000000', // sender.amount
        '0x5234567890123456789012345678901234567890', // affiliateWallet
        '5000', // affiliateAmount
        signature.v, // v
        signature.r, // r
        signature.s, // s
      ])

      // Verify array length
      expect(params.length).to.equal(18)
    })

    it('sanitizes empty values correctly', async () => {
      // Create an unsigned order with valid values first
      const unsignedOrder = createOrder({
        nonce: 1234567890,
        expiry: '1234567890',
        protocolFee: 300,
        signer: {
          wallet: '0x1234567890123456789012345678901234567890',
          token: '0x2234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '0',
          amount: '1000000',
        },
        sender: {
          wallet: '0x3234567890123456789012345678901234567890',
          token: '0x4234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '1',
          amount: '2000000',
        },
      })

      const signature = await createOrderSignature(
        unsignedOrder,
        wallet.privateKey,
        ADDRESS_ZERO,
        1
      )

      // Create a full order with empty values
      const emptyOrder = {
        ...unsignedOrder,
        ...signature,
        chainId: 1,
        swapContract: ADDRESS_ZERO,
        sender: {
          wallet: '',
          token: '',
          kind: '',
          id: '',
          amount: '2000000',
        },
      }

      // Test that fullOrderToParams sanitizes the values
      const params = fullOrderToParams(emptyOrder)

      // Verify params have proper zero values for empty fields
      expect(params[10]).to.equal(ADDRESS_ZERO) // sender.wallet
      expect(params[11]).to.equal(ADDRESS_ZERO) // sender.token
      expect(params[12]).to.equal('0x00000000') // sender.kind
      expect(params[13]).to.equal('0') // sender.id
      expect(params[14]).to.equal('2000000') // sender.amount
    })

    it('handles missing sender values correctly', async () => {
      // Create an unsigned order with minimal sender info
      const unsignedOrder = createOrder({
        nonce: 1234567890,
        expiry: '1234567890',
        protocolFee: 300,
        signer: {
          wallet: '0x1234567890123456789012345678901234567890',
          token: '0x2234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '0',
          amount: '1000000',
        },
        // Only specify sender amount, rest should be defaults
        sender: {
          amount: '2000000',
        },
      })

      // Verify the defaults are set in the original order
      expect(unsignedOrder.sender.wallet).to.equal(ADDRESS_ZERO)
      expect(unsignedOrder.sender.token).to.equal(ADDRESS_ZERO)
      expect(unsignedOrder.sender.kind).to.equal('0x36372b07')
      expect(unsignedOrder.sender.id).to.equal('0')
      expect(unsignedOrder.sender.amount).to.equal('2000000')

      const signature = await createOrderSignature(
        unsignedOrder,
        wallet.privateKey,
        ADDRESS_ZERO,
        1
      )

      const fullOrder = {
        ...unsignedOrder,
        ...signature,
        chainId: 1,
        swapContract: ADDRESS_ZERO,
      }

      const compressed = compressFullOrder(fullOrder)
      const decompressed = decompressFullOrder(compressed)

      // Verify the values match the original defaults
      expect(decompressed.sender.wallet).to.equal(unsignedOrder.sender.wallet)
      expect(decompressed.sender.token).to.equal(unsignedOrder.sender.token)
      expect(decompressed.sender.kind).to.equal(unsignedOrder.sender.kind)
      expect(decompressed.sender.id).to.equal(unsignedOrder.sender.id)
      expect(decompressed.sender.amount).to.equal(unsignedOrder.sender.amount)
    })

    it('handles falsey sender values correctly', async () => {
      // Create an unsigned order with falsey sender values
      const unsignedOrder = createOrder({
        nonce: 1234567890,
        expiry: '1234567890',
        protocolFee: 300,
        signer: {
          wallet: '0x1234567890123456789012345678901234567890',
          token: '0x2234567890123456789012345678901234567890',
          kind: '0x36372b07',
          id: '0',
          amount: '1000000',
        },
        sender: {
          wallet: ADDRESS_ZERO,
          token: ADDRESS_ZERO,
          kind: '0x00000000',
          id: '0',
          amount: '2000000',
        },
      })

      // Create signature
      const signature = await createOrderSignature(
        unsignedOrder,
        wallet.privateKey,
        ADDRESS_ZERO,
        1
      )

      const fullOrder = {
        ...unsignedOrder,
        ...signature,
        chainId: 1,
        swapContract: ADDRESS_ZERO,
      }

      // Now we can try to set falsey values after signing
      const falseyOrder = {
        ...fullOrder,
        sender: {
          ...fullOrder.sender,
          wallet: '',
          token: '',
          kind: '',
          id: '',
          amount: '2000000',
        },
      }

      const compressed = compressFullOrder(falseyOrder)
      const decompressed = decompressFullOrder(compressed)

      // Verify the values are sanitized to proper zero values
      expect(decompressed.sender.wallet).to.equal(ADDRESS_ZERO)
      expect(decompressed.sender.token).to.equal(ADDRESS_ZERO)
      expect(decompressed.sender.kind).to.equal('0x00000000')
      expect(decompressed.sender.id).to.equal('0')
      expect(decompressed.sender.amount).to.equal('2000000')
    })
  })

  describe('Delegate calculations', () => {
    it('calculates correct signer amount for simple delegate fill', async () => {
      // Test with different decimals (6 vs 18)
      const fillAmount = '500000' // 0.5 USDC
      const ruleAmount = '1000000' // 1 USDC
      const signerAmount = '1000000000000000000' // 1 ETH

      // Known result from contract test
      expect(getCostByRule(fillAmount, ruleAmount, signerAmount)).to.equal(
        '500000000000000000'
      ) // 0.5 ETH
    })

    it('calculates correct signer amount with rounding and different decimals', async () => {
      // Rule amounts: 1.1 USDC (6 decimals) to 1.6 ETH (18 decimals)
      const senderRuleAmount = '1100000' // 1.1 USDC
      const signerRuleAmount = '1600000000000000000' // 1.6 ETH
      const fillSenderAmount = '50000' // 0.05 USDC (from 1.1 USDC * 10/220)

      // Known result from contract test
      expect(
        getCostByRule(fillSenderAmount, senderRuleAmount, signerRuleAmount)
      ).to.equal('72727272727272727') // ≈0.072727272727272727 ETH
    })
  })
})
