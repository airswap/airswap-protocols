const MakerDelegateManager = artifacts.require('MakerDelegateManager')
const MakerDelegateFactory = artifacts.require('MakerDelegateFactory')
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

contract('MakerDelegateManager Unit Tests', async (accounts) => {
  let owner = accounts[0];
  let generatedDelegate = accounts[1];
  let makerDelegateManager;
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
    mockFactoryTemplate = await MakerDelegateFactory.new()

    // mock createMakerDelegate()
    let mockFactory_createMakerDelegate =
      mockFactoryTemplate.contract.methods.createMakerDelegate(EMPTY_ADDRESS, EMPTY_ADDRESS).encodeABI();
    await mockFactory.givenMethodReturnAddress(mockFactory_createMakerDelegate, generatedDelegate)
  }

  before(async () => {
    await setupMockFactory();

    makerDelegateManager = await MakerDelegateManager.new(mockFactory.address)
    mockSwap = await MockContract.new()
  })

  describe('Test initial values', async () => {
    it('Test mockFactory', async () => {
      let val = await makerDelegateManager.factory.call()
      equal(val, mockFactory.address, "mockFactory was not properly set")
    })
  })

  describe('Test createMakerDelegate', async () => {
    it("Test when empty address is given", async() => {
      await reverted(makerDelegateManager.createMakerDelegate.call(EMPTY_ADDRESS), "SWAP_ADDRESS_REQUIRED");
    })

    it("Test when a delegate is returned", async() => {
      let val = await makerDelegateManager.createMakerDelegate.call(mockSwap.address);
      equal(val, generatedDelegate, "no maker delegate was created")
    })

    it("Test when a delegate is added to owner to delegate list mapping", async() => {
      //add generate two delegates
      await makerDelegateManager.createMakerDelegate(mockSwap.address);
      await makerDelegateManager.createMakerDelegate(mockSwap.address);

      //retrieve the list
      let val = await makerDelegateManager.getMakerAddressToDelegates.call(owner);
      equal(val.length, 2, "there are too many items in the returned list");
      equal(val[0], generatedDelegate, "there was an issue creating the delegate");
      equal(val[1], generatedDelegate, "there was an issue creating the delegate");
    })

    it("Test when a create delegate event is emitted", async() => {
      let trx = await makerDelegateManager.createMakerDelegate(mockSwap.address);
      emitted(trx, "MakerDelegateCreated", (e) => {
        return e.owner === owner && e.delegate == generatedDelegate;
      })
    })
  })

  describe('Test setRuleAndIntent()', async () => {})

  describe('Test unsetRuleAndIntent()', async () => {})
})
