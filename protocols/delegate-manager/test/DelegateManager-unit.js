const DelegateManager = artifacts.require('DelegateManager')
const DelegateFactory = artifacts.require('DelegateFactory')
const MockContract = artifacts.require('MockContract')
const {
  equal,
  notEqual,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { orders } = require('@airswap/order-utils')

contract('DelegateManager Unit Tests', async accounts => {
  let owner = accounts[0]
  let tradeWallet_1 = accounts[1]
  let tradeWallet_2 = accounts[1]
  let generatedDelegate = accounts[2]
  let delegateManager
  let mockFactory
  let mockSwap

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockFactory() {
    mockSwap = await MockContract.new()
    mockFactory = await MockContract.new()
    mockFactoryTemplate = await DelegateFactory.new(mockSwap.address)

    // mock createDelegate()
    let mockFactory_createDelegate = mockFactoryTemplate.contract.methods
      .createDelegate(EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockFactory.givenMethodReturnAddress(
      mockFactory_createDelegate,
      generatedDelegate
    )
  }

  before(async () => {
    await setupMockFactory()
    delegateManager = await DelegateManager.new(mockFactory.address)
  })

  describe('Test initial values', async () => {
    it('Test factory address', async () => {
      let val = await delegateManager.factory.call()
      equal(val, mockFactory.address, 'mockFactory was not properly set')
    })
  })

  describe('Test createDelegate', async () => {
    it('Test creating a delegate with 0x0 trade wallet', async () => {
      let val = await delegateManager.createDelegate.call(EMPTY_ADDRESS)
      equal(val, generatedDelegate, 'no delegate was created')
    })

    it('Test creating a delegate with non 0x0 trade wallet', async () => {
      let val = await delegateManager.createDelegate.call(tradeWallet_1)
      equal(val, generatedDelegate, 'no delegate was created')
    })

    it('Test when a delegate is added to owner to delegate list mapping', async () => {
      //generate two delegates against the caller
      await delegateManager.createDelegate(tradeWallet_1)
      await delegateManager.createDelegate(tradeWallet_2)

      //retrieve the list
      let val = await delegateManager.getOwnerAddressToDelegates.call(owner)
      equal(val.length, 2, 'there are too many items in the returned list')
      equal(
        val[0],
        generatedDelegate,
        'there was an issue creating the delegate'
      )
      equal(
        val[1],
        generatedDelegate,
        'there was an issue creating the delegate'
      )
    })

    it('Test when a create delegate event is emitted', async () => {
      let trx = await delegateManager.createDelegate(tradeWallet_1)
      emitted(trx, 'DelegateCreated', e => {
        return e.owner === owner && e.delegate == generatedDelegate
      })
    })
  })

  it('Test setRuleAndIntent()', async () => {
    // construct delegate with no trade wallet
    let trx = await delegateManager.createDelegate(EMPTY_ADDRESS)

    // get generated delegate. I've mocked to always return generatedDelegate
    let delegateAddress = generatedDelegate

    let intent = [
      tokenWETH.address,
      tokenDAI.address,
      250,
      padAddressToLocator(delegateAddress)
    ];

    let rule = [
      tokenWETH.address,
      tokenDAI.address,
      100000,
      300,
      0
    ];

    // TODO: 
    // mock the delegate and delegate.setRule()
    // mock the indexer and indexer.setIntent()
    // create the Type in types or use from .sol files
    // possibly migrate the delegate and indexer to the new types
    await delegateManager.setRuleAndIntent(delegateAddress, rule, intent, )
  })

  it('Test unsetRuleAndIntent()', async () => {})
})
