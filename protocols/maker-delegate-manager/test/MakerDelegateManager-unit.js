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
    await mockFactory.givenMethodReturnAddress(mockFactory_createMakerDelegate, accounts[1])
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
      equal(val, accounts[1], "no maker delegate was created")
    })

    it("Test when a delegate is added to owner to delegate list mapping", async() => {
      let trx = await makerDelegateManager.createMakerDelegate.call();
      // get makerAddressToDelegate value
    })

    it("Test when a create delegate event is emitted", async() => {
      await makerDelegateManager.createMakerDelegate.call();
      // check for event MakerDelegateCreated
    })
  })

  describe('Test getMakerSideQuote', async () => {})

  describe('Test getTakerSideQuote', async () => {})

  describe('Test getMaxQuote', async () => {})

  describe('Test provideOrder', async () => {})
})
