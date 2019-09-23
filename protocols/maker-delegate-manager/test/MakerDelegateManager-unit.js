const MakerDelegate = artifacts.require('MakerDelegate')
const Swap = artifacts.require('Swap')
const MockContract = artifacts.require('MockContract')
const {
  equal,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

const { orders } = require('@airswap/order-utils')

contract('MakerDelegate Unit Tests', async accounts => {
  const owner = accounts[0]
  const notOwner = accounts[2]
  let makerDelegate
  let mockSwap
  let snapshotId
  let swapFunction
  const TAKER_TOKEN = accounts[9]
  const MAKER_TOKEN = accounts[8]


  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  describe('Test initial values', async () => {
  })

  describe('Test setters', async () => {
  })

  describe('Test getMakerSideQuote', async () => {
  })

  describe('Test getTakerSideQuote', async () => {
  })

  describe('Test getMaxQuote', async () => {
  })

  describe('Test provideOrder', async () => {
  })
})
