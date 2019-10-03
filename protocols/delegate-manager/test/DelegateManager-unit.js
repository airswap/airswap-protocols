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

contract('DelegateManager Unit Tests', async (accounts) => {
  let owner = accounts[0];
  let generatedDelegate = accounts[1];
  let delegateManager;
  let mockFactory;
  let mockSwap;

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockFactory() {
    mockFactory = await MockContract.new()
    mockFactoryTemplate = await DelegateFactory.new()

    // mock createDelegate()
    let mockFactory_createDelegate =
      mockFactoryTemplate.contract.methods.createDelegate(EMPTY_ADDRESS, EMPTY_ADDRESS).encodeABI();
    await mockFactory.givenMethodReturnAddress(mockFactory_createDelegate, generatedDelegate)
  }

  before(async () => {
    await setupMockFactory();

    delegateManager = await DelegateManager.new(mockFactory.address)
    mockSwap = await MockContract.new()
  })

  describe('Test initial values', async () => {
    it('Test mockFactory', async () => {
      let val = await delegateManager.factory.call()
      equal(val, mockFactory.address, "mockFactory was not properly set")
    })
  })

  describe('Test createDelegate', async () => {
    it("Test when empty address is given", async() => {
      await reverted(delegateManager.createDelegate.call(EMPTY_ADDRESS), "SWAP_ADDRESS_REQUIRED");
    })

    it("Test when a delegate is returned", async() => {
      let val = await delegateManager.createDelegate.call(mockSwap.address);
      equal(val, generatedDelegate, "no delegate was created")
    })

    it("Test when a delegate is added to owner to delegate list mapping", async() => {
      //add generate two delegates
      await delegateManager.createDelegate(mockSwap.address);
      await delegateManager.createDelegate(mockSwap.address);

      //retrieve the list
      let val = await delegateManager.getOwnerAddressToDelegates.call(owner);
      equal(val.length, 2, "there are too many items in the returned list");
      equal(val[0], generatedDelegate, "there was an issue creating the delegate");
      equal(val[1], generatedDelegate, "there was an issue creating the delegate");
    })

    it("Test when a create delegate event is emitted", async() => {
      let trx = await delegateManager.createDelegate(mockSwap.address);
      emitted(trx, "DelegateCreated", (e) => {
        return e.owner === owner && e.delegate == generatedDelegate;
      })
    })
  })

  describe('Test setRuleAndIntent()', async () => {})

  describe('Test unsetRuleAndIntent()', async () => {})
})
