const DelegateFrontend = artifacts.require('DelegateFrontend')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const MockContract = artifacts.require('MockContract')
const abi = require('ethereumjs-abi')
const { equal, passes } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const BigNumber = require('bignumber.js')
const { padAddressToLocator } = require('@airswap/test-utils').padding
const { orders } = require('@airswap/order-utils')

contract('DelegateFrontend Unit Tests', async () => {
  const highVal = 400
  const lowVal = 200
  const maxUint = new BigNumber('1.1579209e+77')
  const minUint = new BigNumber('0.0000000')

  let snapshotId
  let mockDelegateHigh
  let mockDelegateHighLocator
  let mockDelegateLow
  let mockDelegateLowLocator
  let mockSwap
  let mockIndexer
  let peerFrontend
  let mockUserSendToken
  let mockUserReceiveToken
  let indexer_getIntents

  let emptyLocator = padAddressToLocator(EMPTY_ADDRESS)

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockDelegateFrontend() {
    let peerTemplate = await Delegate.new(
      EMPTY_ADDRESS,
      EMPTY_ADDRESS,
      EMPTY_ADDRESS
    )
    mockDelegateHigh = await MockContract.new()
    mockDelegateHighLocator = padAddressToLocator(mockDelegateHigh.address)
    mockDelegateLow = await MockContract.new()
    mockDelegateLowLocator = padAddressToLocator(mockDelegateLow.address)

    //mock peer getMakerSideQuote()
    let peer_getMakerSideQuote = peerTemplate.contract.methods
      .getMakerSideQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockDelegateHigh.givenMethodReturnUint(
      peer_getMakerSideQuote,
      highVal
    )
    await mockDelegateLow.givenMethodReturnUint(peer_getMakerSideQuote, lowVal)

    //mock peer getMakerSideQuote()
    let peer_getTakerSideQuote = peerTemplate.contract.methods
      .getTakerSideQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockDelegateHigh.givenMethodReturnUint(
      peer_getTakerSideQuote,
      highVal
    )
    await mockDelegateLow.givenMethodReturnUint(peer_getTakerSideQuote, lowVal)

    // mock peer has owner()
    let peer_owner = peerTemplate.contract.methods.owner().encodeABI()
    await mockDelegateHigh.givenMethodReturnAddress(peer_owner, EMPTY_ADDRESS)
    await mockDelegateLow.givenMethodReturnAddress(peer_owner, EMPTY_ADDRESS)

    // mock peer trade wallet
    let peer_tradeWallet = peerTemplate.contract.methods
      .tradeWallet()
      .encodeABI()
    await mockDelegateHigh.givenMethodReturnAddress(
      peer_tradeWallet,
      EMPTY_ADDRESS
    )
    await mockDelegateLow.givenMethodReturnAddress(
      peer_tradeWallet,
      EMPTY_ADDRESS
    )

    //mock peer provideUnsignedOrder()
    const order = await orders.getOrder({})

    let peer_provideUnsignedOrder = peerTemplate.contract.methods
      .provideOrder(order)
      .encodeABI()
    await mockDelegateHigh.givenMethodReturnBool(
      peer_provideUnsignedOrder,
      true
    )
    await mockDelegateLow.givenMethodReturnBool(peer_provideUnsignedOrder, true)
  }

  async function setupMockIndexer() {
    let indexerTemplate = await Indexer.new(EMPTY_ADDRESS, EMPTY_ADDRESS)
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

    await setupMockDelegateFrontend()
    await setupMockIndexer()
  }

  before('deploy DelegateFrontend', async () => {
    await setupMocks()
    peerFrontend = await DelegateFrontend.new(
      mockIndexer.address,
      mockSwap.address
    )
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contact', async () => {
      let val = await peerFrontend.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test initial Indexer Contact', async () => {
      let val = await peerFrontend.indexer.call()
      equal(val, mockIndexer.address, 'indexer address is incorrect')
    })
  })

  describe('Test getBestTakerSideQuote()', async () => {
    it('test default values are returned with an empty indexer', async () => {
      //mock indexer getIntents() where there are no locators
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(['bytes32[]'], [[]])
      )

      let val = await peerFrontend.getBestTakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      let lowestCost = new BigNumber(val[1]).toPrecision(5)
      equal(val[0], emptyLocator)
      equal(lowestCost, maxUint.toPrecision(5))
    })

    it('test that the lowest cost peer is returned with an indexer ordered high to low', async () => {
      //mock indexer getIntents() where locators are ordered high to low
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateHighLocator, mockDelegateLowLocator]]
        )
      )

      //this should always select the lowest cost peer available
      let val = await peerFrontend.getBestTakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      equal(val[0], mockDelegateLowLocator)
      equal(val[1].toNumber(), lowVal)
    })

    it('test that the lowest cost peer is returned with an indexer ordered low to high', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateLowLocator, mockDelegateHighLocator]]
        )
      )

      //this should always select the lowest cost peer available
      let val = await peerFrontend.getBestTakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )
      equal(val[0], mockDelegateLowLocator)
      equal(val[1].toNumber(), lowVal)
    })
  })

  describe('Test getBestMakerSideQuote()', async () => {
    it('test default values are returned with an empty indexer', async () => {
      //mock indexer getIntents() where there are no locators
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(['bytes32[]'], [[]])
      )

      let val = await peerFrontend.getBestMakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      let lowestCost = new BigNumber(val[1]).toPrecision(5)
      equal(val[0], emptyLocator)
      equal(lowestCost, minUint.toPrecision(5))
    })

    it('test that the lowest cost peer is returned with an indexer ordered high to low', async () => {
      //mock indexer getIntents() where locators are ordered high to low
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateHighLocator, mockDelegateLowLocator]]
        )
      )

      //this should always select the lowest cost peer available
      let val = await peerFrontend.getBestMakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      equal(val[0], mockDelegateHighLocator)
      equal(val[1].toNumber(), highVal)
    })

    it('test that the lowest cost peer is returned with an indexer ordered low to high', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateLowLocator, mockDelegateHighLocator]]
        )
      )

      //this should always select the lowest cost peer available
      let val = await peerFrontend.getBestMakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )
      equal(val[0], mockDelegateHighLocator)
      equal(val[1].toNumber(), highVal)
    })
  })

  describe('Test fillBestTakerSideOrder()', async () => {
    it('test by ensuring all internal methods are called', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateLowLocator, mockDelegateHighLocator]]
        )
      )

      let trx = await peerFrontend.fillBestTakerSideOrder(
        180,
        mockUserSendToken.address,
        mockUserReceiveToken.address,
        2
      )
      passes(trx)
    })
  })

  describe('Test fillBestMakerSideOrder()', async () => {})
})
