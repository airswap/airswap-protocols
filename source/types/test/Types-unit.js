const Types = artifacts.require('../contracts/Types')
const MockTypes = artifacts.require('MockTypes')
const { ethers } = require('ethers')
const { equal } = require('@airswap/test-utils').assert
const {
  DOMAIN_NAME,
  DOMAIN_VERSION,
  ADDRESS_ZERO,
} = require('@airswap/constants')
const { hashDomain, getOrderHash } = require('@airswap/utils')
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { createOrder, signOrder } = require('@airswap/utils')

const PROVIDER_URL = web3.currentProvider.host

contract('Types Unit Tests', async ([defaultAccount]) => {
  let mockTypes
  let snapshotId

  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)
  const signer = provider.getSigner(defaultAccount)

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('deploy MockTypes', async () => {
    const typesLib = await Types.new()
    await MockTypes.link('Types', typesLib.address)
    mockTypes = await MockTypes.new()
  })

  describe('Test hashing functions within the library', async () => {
    it('Test hashOrder', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: defaultAccount,
          },
        }),
        signer,
        ADDRESS_ZERO
      )

      const hashedDomain = '0x' + hashDomain(mockTypes.address).toString('hex')
      const hashedOrder = await mockTypes.hashOrder.call(order, hashedDomain)
      equal(
        hashedOrder,
        '0x' + getOrderHash(order, mockTypes.address).toString('hex'),
        'Order hash hashed incorrectly.'
      )
    })

    it('Test hashDomain', async () => {
      const hashedDomain = await mockTypes.hashDomain.call(
        web3.utils.fromAscii(DOMAIN_NAME),
        web3.utils.fromAscii(DOMAIN_VERSION),
        mockTypes.address
      )
      equal(
        hashedDomain,
        '0x' + hashDomain(mockTypes.address).toString('hex'),
        'Domain hash hashed incorrectly.'
      )
    })
  })
})
