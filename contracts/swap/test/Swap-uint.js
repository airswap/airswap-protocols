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
  let snapshotId
  let swap

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })
  
  before('deploy Swap', async () => {
    swap = Swap.new()
  })

  describe('Test initial values', async () => {
  })

  describe('Test swap', async () => {
  })

  describe('Test swapSimple', async () => {
  })

  descrive('Test cancel', async () => {
  })

  descrive('Test invalidate', async () => {
  })

  descrive('Test authorize', async () => {
  })

  descrive('Test revoke', async () => {
  })
})
