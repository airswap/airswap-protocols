const Swap = artifacts.require('Swap')
const Wrapper = artifacts.require('Wrapper')
const WETH9 = artifacts.require('WETH9')

const { emitted, getResult, passes } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot, getTimestampPlusDays } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')

contract('Wrapper Unit Tests', (accounts) => {

  let mockSwap
  let mockWeth

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('deploy Wrapper', async () => {
    await setupMocks()
    consumer = await Consumer.new(mockSwap.address, mockIndexer.address)
  })

  describe('Test initial values', async () => {
  })
})
