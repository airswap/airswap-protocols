/* global artifacts, contract, web3*/
const Types = artifacts.require('../contracts/Types')
const MockTypes = artifacts.require('MockTypes')
const { equal } = require('@airswap/test-utils').assert
const {
  defaults,
  EMPTY_ADDRESS,
  DOMAIN_NAME,
  DOMAIN_VERSION,
} = require('@airswap/order-utils').constants
const {
  hashParty,
  hashDomain,
  getOrderHash,
} = require('@airswap/order-utils').hashes
const { orders } = require('@airswap/order-utils')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

contract('Types Unit Tests', async () => {
  let mockTypes
  let snapshotId

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('deploy MockTypes', async () => {
    const typesLib = await Types.new()
    await MockTypes.link('Types', typesLib.address)
    mockTypes = await MockTypes.new()
  })

  describe('Test hashing functions within the library', async () => {
    it('Test hashParty', async () => {
      let result = await mockTypes.hashParty.call([
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        0,
      ])
      equal(
        result,
        '0x' + hashParty(defaults.Party).toString('hex'),
        'Part hash hashed incorrectly.'
      )
    })

    it('Test hashOrder', async () => {
      const { order } = await orders.getOrder({})
      let hashedDomain = '0x' + hashDomain(mockTypes.address).toString('hex')
      let hashedOrder = await mockTypes.hashOrder(order, hashedDomain)
      equal(
        hashedOrder,
        '0x' + getOrderHash(order, mockTypes.address).toString('hex'),
        'Order hash hashed incorrectly.'
      )
    })

    it('Test hashDomain', async () => {
      let hashedDomain = await mockTypes.hashDomain.call(
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
