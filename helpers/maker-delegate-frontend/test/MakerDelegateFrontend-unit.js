const MakerDelegateFrontend = artifacts.require('MakerDelegateFrontend')
const Indexer = artifacts.require('Indexer')
const MakerDelegate = artifacts.require('MakerDelegate')
const MockContract = artifacts.require('MockContract')
const abi = require('ethereumjs-abi')
const { equal, passes } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const BigNumber = require('bignumber.js')
const { padAddressToLocator } = require('@airswap/test-utils').padding
const { orders } = require('@airswap/order-utils')

contract('MakerDelegateFrontend Unit Tests', async () => {
  const highVal = 400
  const lowVal = 200
  const maxUint = new BigNumber('1.1579209e+77')
  const minUint = new BigNumber('0.0000000')

  let snapshotId
  let mockMakerDelegateHigh
  let mockMakerDelegateHighLocator
  let mockMakerDelegateLow
  let mockMakerDelegateLowLocator
  let mockSwap
  let mockIndexer
  let makerDelegateFrontend
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

  async function setupMockMakerDelegateFrontend() {
    let makerDelegateTemplate = await MakerDelegate.new(
      EMPTY_ADDRESS,
      EMPTY_ADDRESS
    )
    mockMakerDelegateHigh = await MockContract.new()
    mockMakerDelegateHighLocator = padAddressToLocator(
      mockMakerDelegateHigh.address
    )
    mockMakerDelegateLow = await MockContract.new()
    mockMakerDelegateLowLocator = padAddressToLocator(
      mockMakerDelegateLow.address
    )

    //mock makerDelegate getMakerSideQuote()
    let makerDelegate_getMakerSideQuote = makerDelegateTemplate.contract.methods
      .getMakerSideQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockMakerDelegateHigh.givenMethodReturnUint(
      makerDelegate_getMakerSideQuote,
      highVal
    )
    await mockMakerDelegateLow.givenMethodReturnUint(
      makerDelegate_getMakerSideQuote,
      lowVal
    )

    //mock makerDelegate getMakerSideQuote()
    let makerDelegate_getTakerSideQuote = makerDelegateTemplate.contract.methods
      .getTakerSideQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockMakerDelegateHigh.givenMethodReturnUint(
      makerDelegate_getTakerSideQuote,
      highVal
    )
    await mockMakerDelegateLow.givenMethodReturnUint(
      makerDelegate_getTakerSideQuote,
      lowVal
    )

    // mock makerDelegate has owner()
    let makerDelegate_owner = makerDelegateTemplate.contract.methods
      .owner()
      .encodeABI()
    await mockMakerDelegateHigh.givenMethodReturnAddress(
      makerDelegate_owner,
      EMPTY_ADDRESS
    )
    await mockMakerDelegateLow.givenMethodReturnAddress(
      makerDelegate_owner,
      EMPTY_ADDRESS
    )

    //mock makerDelegate provideUnsignedOrder()
    const order = await orders.getOrder({})

    let makerDelegate_provideUnsignedOrder = makerDelegateTemplate.contract.methods
      .provideOrder(order)
      .encodeABI()
    await mockMakerDelegateHigh.givenMethodReturnBool(
      makerDelegate_provideUnsignedOrder,
      true
    )
    await mockMakerDelegateLow.givenMethodReturnBool(
      makerDelegate_provideUnsignedOrder,
      true
    )
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

    await setupMockMakerDelegateFrontend()
    await setupMockIndexer()
  }

  before('deploy MakerDelegateFrontend', async () => {
    await setupMocks()
    makerDelegateFrontend = await MakerDelegateFrontend.new(
      mockIndexer.address,
      mockSwap.address
    )
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contact', async () => {
      let val = await makerDelegateFrontend.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test initial Indexer Contact', async () => {
      let val = await makerDelegateFrontend.indexer.call()
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

      let val = await makerDelegateFrontend.getBestTakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      let lowestCost = new BigNumber(val[1]).toPrecision(5)
      equal(val[0], emptyLocator)
      equal(lowestCost, maxUint.toPrecision(5))
    })

    it('test that the lowest cost makerDelegate is returned with an indexer ordered high to low', async () => {
      //mock indexer getIntents() where locators are ordered high to low
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockMakerDelegateHighLocator, mockMakerDelegateLowLocator]]
        )
      )

      //this should always select the lowest cost makerDelegate available
      let val = await makerDelegateFrontend.getBestTakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      equal(val[0], mockMakerDelegateLowLocator)
      equal(val[1].toNumber(), lowVal)
    })

    it('test that the lowest cost makerDelegate is returned with an indexer ordered low to high', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockMakerDelegateLowLocator, mockMakerDelegateHighLocator]]
        )
      )

      //this should always select the lowest cost makerDelegate available
      let val = await makerDelegateFrontend.getBestTakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )
      equal(val[0], mockMakerDelegateLowLocator)
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

      let val = await makerDelegateFrontend.getBestMakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      let lowestCost = new BigNumber(val[1]).toPrecision(5)
      equal(val[0], emptyLocator)
      equal(lowestCost, minUint.toPrecision(5))
    })

    it('test that the lowest cost makerDelegate is returned with an indexer ordered high to low', async () => {
      //mock indexer getIntents() where locators are ordered high to low
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockMakerDelegateHighLocator, mockMakerDelegateLowLocator]]
        )
      )

      //this should always select the lowest cost makerDelegate available
      let val = await makerDelegateFrontend.getBestMakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      equal(val[0], mockMakerDelegateHighLocator)
      equal(val[1].toNumber(), highVal)
    })

    it('test that the lowest cost makerDelegate is returned with an indexer ordered low to high', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockMakerDelegateLowLocator, mockMakerDelegateHighLocator]]
        )
      )

      //this should always select the lowest cost makerDelegate available
      let val = await makerDelegateFrontend.getBestMakerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )
      equal(val[0], mockMakerDelegateHighLocator)
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
          [[mockMakerDelegateLowLocator, mockMakerDelegateHighLocator]]
        )
      )

      let trx = await makerDelegateFrontend.fillBestTakerSideOrder(
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
