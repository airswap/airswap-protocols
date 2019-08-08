const Consumer = artifacts.require('Consumer')
const Indexer = artifacts.require('Indexer')
const Peer = artifacts.require('Peer')
const MockContract = artifacts.require('MockContract')
const abi = require('ethereumjs-abi')
const { equal, passes } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const BigNumber = require('bignumber.js')

contract('Consumer Unit Tests', async () => {
  const highVal = 400
  const lowVal = 200
  const maxUint = new BigNumber('1.1579209e+77')

  let snapshotId
  let mockPeerHigh
  let mockPeerLow
  let mockSwap
  let mockIndexer
  let consumer
  let mockUserSendToken
  let mockUserReceiveToken
  let indexer_getIntents

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockDelgate() {
    let peerTemplate = await Peer.new(EMPTY_ADDRESS)
    mockPeerHigh = await MockContract.new()
    mockPeerLow = await MockContract.new()

    //mock peer getBuyQuote()
    let peer_getBuyQuote = peerTemplate.contract.methods
      .getBuyQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockPeerHigh.givenMethodReturnUint(peer_getBuyQuote, highVal)
    await mockPeerLow.givenMethodReturnUint(peer_getBuyQuote, lowVal)

    //mock peer provideUnsignedOrder()
    let peer_provideUnsignedOrder = peerTemplate.contract.methods
      .provideUnsignedOrder(0, 0, EMPTY_ADDRESS, 0, EMPTY_ADDRESS)
      .encodeABI()
    await mockPeerHigh.givenMethodReturnBool(peer_provideUnsignedOrder, true)
    await mockPeerLow.givenMethodReturnBool(peer_provideUnsignedOrder, true)
  }

  async function setupMockIndexer() {
    let indexerTemplate = await Indexer.new(EMPTY_ADDRESS, 0)
    mockIndexer = await MockContract.new()

    indexer_getIntents = indexerTemplate.contract.methods
      .getIntents(EMPTY_ADDRESS, EMPTY_ADDRESS, 0)
      .encodeABI()
  }

  async function setupMocks() {
    mockUserSendToken = await MockContract.new()
    await mockUserSendToken.givenAnyReturnBool(true)

    mockUserReceiveToken = await MockContract.new()
    await mockUserReceiveToken.givenAnyReturnBool(true)

    mockSwap = await MockContract.new()
    await mockSwap.givenAnyReturnBool(true)

    await setupMockDelgate()
    await setupMockIndexer()
  }

  before('deploy Consumer', async () => {
    await setupMocks()
    consumer = await Consumer.new(mockSwap.address, mockIndexer.address)
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contact', async () => {
      let val = await consumer.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test initial Indexer Contact', async () => {
      let val = await consumer.indexerContract.call()
      equal(val, mockIndexer.address, 'indexer address is incorrect')
    })
  })

  describe('Test findBestBuy()', async () => {
    it('test default values are returned with an empty indexer', async () => {
      //mock indexer getIntents() where there are no locators
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(['address[]'], [[]])
      )

      let val = await consumer.findBestBuy.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      let lowestCost = new BigNumber(val[1]).toPrecision(5)
      equal(val[0], EMPTY_ADDRESS)
      equal(lowestCost, maxUint.toPrecision(5))
    })

    it('test that the lowest cost peer is returned with an indexer ordered high to low', async () => {
      //mock indexer getIntents() where locators are ordered high to low
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['address[]'],
          [[mockPeerHigh.address, mockPeerLow.address]]
        )
      )

      //this should always select the lowest cost peer available
      let val = await consumer.findBestBuy.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      equal(val[0], mockPeerLow.address)
      equal(val[1].toNumber(), lowVal)
    })

    it('test that the lowest cost peer is returned with an indexer ordered low to high', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['address[]'],
          [[mockPeerLow.address, mockPeerHigh.address]]
        )
      )

      //this should always select the lowest cost peer available
      let val = await consumer.findBestBuy.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )
      equal(val[0], mockPeerLow.address)
      equal(val[1].toNumber(), lowVal)
    })
  })

  describe('Test takeBestBuy()', async () => {
    it('test by ensuring all internal methods are called', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['address[]'],
          [[mockPeerLow.address, mockPeerHigh.address]]
        )
      )

      let trx = await consumer.takeBestBuy(
        180,
        mockUserSendToken.address,
        mockUserReceiveToken.address,
        2
      )
      passes(trx)
    })
  })
})
