const Swap = artifacts.require('Swap')
const MockContract = artifacts.require('MockContract')

const {
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { allowances, balances } = require('@airswap/test-utils').balances
const { getLatestTimestamp } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')

contract('Swap Unit Tests', async () => {

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })
  
  before('deploy Swap', async () => {
  })

  describe('Test initial values', async () => {
  })
})
