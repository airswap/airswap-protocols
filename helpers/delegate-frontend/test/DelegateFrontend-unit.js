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
  let delegateFrontend
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
    let delegateTemplate = await Delegate.new(
      EMPTY_ADDRESS,
      EMPTY_ADDRESS,
      EMPTY_ADDRESS
    )
    mockDelegateHigh = await MockContract.new()
    mockDelegateHighLocator = padAddressToLocator(mockDelegateHigh.address)
    mockDelegateLow = await MockContract.new()
    mockDelegateLowLocator = padAddressToLocator(mockDelegateLow.address)

    //mock delegate getSignerSideQuote()
    let delegate_getSignerSideQuote = delegateTemplate.contract.methods
      .getSignerSideQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockDelegateHigh.givenMethodReturnUint(
      delegate_getSignerSideQuote,
      highVal
    )
    await mockDelegateLow.givenMethodReturnUint(
      delegate_getSignerSideQuote,
      lowVal
    )

    //mock delegate getSignerSideQuote()
    let delegate_getSenderSideQuote = delegateTemplate.contract.methods
      .getSenderSideQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockDelegateHigh.givenMethodReturnUint(
      delegate_getSenderSideQuote,
      highVal
    )
    await mockDelegateLow.givenMethodReturnUint(
      delegate_getSenderSideQuote,
      lowVal
    )

    // mock delegate has owner()
    let delegate_owner = delegateTemplate.contract.methods.owner().encodeABI()
    await mockDelegateHigh.givenMethodReturnAddress(
      delegate_owner,
      EMPTY_ADDRESS
    )
    await mockDelegateLow.givenMethodReturnAddress(
      delegate_owner,
      EMPTY_ADDRESS
    )

    // mock delegate trade wallet
    let delegate_tradeWallet = delegateTemplate.contract.methods
      .tradeWallet()
      .encodeABI()
    await mockDelegateHigh.givenMethodReturnAddress(
      delegate_tradeWallet,
      EMPTY_ADDRESS
    )
    await mockDelegateLow.givenMethodReturnAddress(
      delegate_tradeWallet,
      EMPTY_ADDRESS
    )

    //mock delegate provideUnsignedOrder()
    const order = await orders.getOrder({})

    let delegate_provideUnsignedOrder = delegateTemplate.contract.methods
      .provideOrder(order)
      .encodeABI()
    await mockDelegateHigh.givenMethodReturnBool(
      delegate_provideUnsignedOrder,
      true
    )
    await mockDelegateLow.givenMethodReturnBool(
      delegate_provideUnsignedOrder,
      true
    )
  }

  async function setupMockIndexer() {
    let indexerTemplate = await Indexer.new(EMPTY_ADDRESS, EMPTY_ADDRESS)
    mockIndexer = await MockContract.new()

    indexer_getIntents = indexerTemplate.contract.methods
      .getIntents(EMPTY_ADDRESS, EMPTY_ADDRESS, EMPTY_ADDRESS, 0)
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
    delegateFrontend = await DelegateFrontend.new(
      mockIndexer.address,
      mockSwap.address
    )
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contact', async () => {
      let val = await delegateFrontend.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test initial Indexer Contact', async () => {
      let val = await delegateFrontend.indexer.call()
      equal(val, mockIndexer.address, 'indexer address is incorrect')
    })
  })

  describe('Test getBestSenderSideQuote()', async () => {
    it('test default values are returned with an empty indexer', async () => {
      //mock indexer getIntents() where there are no locators
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(['bytes32[]'], [[]])
      )

      let val = await delegateFrontend.getBestSenderSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      let lowestCost = new BigNumber(val[1]).toPrecision(5)
      equal(val[0], emptyLocator)
      equal(lowestCost, maxUint.toPrecision(5))
    })

    it('test that the lowest cost delegate is returned with an indexer ordered high to low', async () => {
      //mock indexer getIntents() where locators are ordered high to low
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateHighLocator, mockDelegateLowLocator]]
        )
      )

      //this should always select the lowest cost delegate available
      let val = await delegateFrontend.getBestSenderSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      equal(val[0], mockDelegateLowLocator)
      equal(val[1].toNumber(), lowVal)
    })

    it('test that the lowest cost delegate is returned with an indexer ordered low to high', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateLowLocator, mockDelegateHighLocator]]
        )
      )

      //this should always select the lowest cost delegate available
      let val = await delegateFrontend.getBestSenderSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )
      equal(val[0], mockDelegateLowLocator)
      equal(val[1].toNumber(), lowVal)
    })
  })

  describe('Test getBestSignerSideQuote()', async () => {
    it('test default values are returned with an empty indexer', async () => {
      //mock indexer getIntents() where there are no locators
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(['bytes32[]'], [[]])
      )

      let val = await delegateFrontend.getBestSignerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      let lowestCost = new BigNumber(val[1]).toPrecision(5)
      equal(val[0], emptyLocator)
      equal(lowestCost, minUint.toPrecision(5))
    })

    it('test that the lowest cost delegate is returned with an indexer ordered high to low', async () => {
      //mock indexer getIntents() where locators are ordered high to low
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateHighLocator, mockDelegateLowLocator]]
        )
      )

      //this should always select the lowest cost delegate available
      let val = await delegateFrontend.getBestSignerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )

      equal(val[0], mockDelegateHighLocator)
      equal(val[1].toNumber(), highVal)
    })

    it('test that the lowest cost delegate is returned with an indexer ordered low to high', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateLowLocator, mockDelegateHighLocator]]
        )
      )

      //this should always select the lowest cost delegate available
      let val = await delegateFrontend.getBestSignerSideQuote.call(
        180,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        2
      )
      equal(val[0], mockDelegateHighLocator)
      equal(val[1].toNumber(), highVal)
    })
  })

  describe('Test fillBestSenderSideOrder()', async () => {
    it('test by ensuring all internal methods are called', async () => {
      //mock indexer getIntents() where locators are ordered low to high
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(
          ['bytes32[]'],
          [[mockDelegateLowLocator, mockDelegateHighLocator]]
        )
      )

      let trx = await delegateFrontend.fillBestSenderSideOrder(
        180,
        mockUserSendToken.address,
        mockUserReceiveToken.address,
        2
      )
      passes(trx)
    })
  })

  describe('Test fillBestSignerSideOrder()', async () => {})
})
