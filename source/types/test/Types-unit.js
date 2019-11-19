const Types = artifacts.require('../contracts/Types')
const MockTypes = artifacts.require('MockTypes')
const { equal } = require('@airswap/test-utils').assert
const {
  DOMAIN_NAME,
  DOMAIN_VERSION,
} = require('@airswap/order-utils').constants
const { hashDomain, getOrderHash } = require('@airswap/order-utils').hashes
const { orders } = require('@airswap/order-utils')
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time

contract('Types Unit Tests', async ([defaultAccount]) => {
  let mockTypes
  let snapshotId

  orders.setVerifyingContract(defaultAccount)

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
      const order = await orders.getOrder({
        signer: {
          wallet: defaultAccount,
        },
      })
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
