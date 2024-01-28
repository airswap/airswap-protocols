import { assert, expect } from 'chai'
import { ethers } from 'ethers'
import { Levels, FullOrderERC20, UnsignedOrderERC20 } from '@airswap/utils'

import { soliditySha3 } from 'web3-utils'
import {
  generateMerkleTreeFromData,
  getMerkleRoot,
  getMerkleProof,
} from '../index'

import {
  ADDRESS_ZERO,
  SECONDS_IN_DAY,
  isValidPricingERC20,
  isValidFullOrderERC20,
  isValidOrderERC20,
  createOrderERC20Signature,
  getSignerFromOrderERC20Signature,
  compressFullOrderERC20,
  decompressFullOrderERC20,
  calculateCostFromLevels,
  getInterfaceId,
  getFullSwapERC20,
  protocolInterfaces,
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
    const signerWallet = '0x51C72848c68a965f66FA7a88855F9f7784502a7F'
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
      signerToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      signerAmount: '1008438461',
      senderWallet: '0x74de5d4FCbf63E00296fd95d33236B9794016631',
      senderToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      senderAmount: '461545050000000000',
      feeAmount: '705906',
    })
  })
})

describe('Merkle', async () => {
  let tree: any
  const treeRoot =
    '0xad519504d6845f9f2529e80a2247d751af56af868ed9f23398705a1ec1bd9fc4'
  const proof = [
    '0xc361555652533965d9a3cda90060cb77c14bbaec689e062a4ca8ce8976836719',
    '0xe2ad42ca8c17510e58dca1ba6f472caafa90b9fee56f679b0e000881096562f6',
  ]

  it('Creates and validates tree', async () => {
    tree = generateMerkleTreeFromData({
      a: '1',
      b: '2',
      c: '3',
    })
    expect(getMerkleRoot(tree)).to.equal(treeRoot)
  })

  it('Validates proof', async () => {
    const element: any = soliditySha3('a', '1')
    expect(getMerkleProof(tree, element).join()).to.equal(proof.join())
  })
})
