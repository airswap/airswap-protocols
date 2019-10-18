const Delegate = artifacts.require('Delegate')
const Indexer = artifacts.require('Indexer')
const DelegateManager = artifacts.require('DelegateManager')
const DelegateFactory = artifacts.require('DelegateFactory')
const MockContract = artifacts.require('MockContract')
const ERC20 = artifacts.require('ERC20')
const {
  equal,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('DelegateManager Unit Tests', async accounts => {
  let owner = accounts[0]
  let tradeWallet_1 = accounts[1]
  let tradeWallet_2 = accounts[1]
  let mockDelegate
  let mockIndexer
  let delegateManager
  let mockFactory
  let mockSwap
  let mockWETH
  let mockDAI
  let mockStakeToken
  let mockStakeToken_allowance
  let mockStakeToken_transferFrom
  let mockStakeToken_transfer 
  let mockIndexer_getScore
  let snapshotId

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockTokens() {
    mockWETH = await MockContract.new()
    mockDAI = await MockContract.new()

    mockStakeToken = await MockContract.new()
    let mockERC20Template = await ERC20.new()

    mockStakeToken_allowance = await mockERC20Template.contract.methods
      .allowance(EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()

    mockStakeToken_transferFrom = await mockERC20Template.contract.methods
      .transferFrom(EMPTY_ADDRESS, EMPTY_ADDRESS, 0)
      .encodeABI()

    mockStakeToken_transfer = await mockERC20Template.contract.methods
      .transfer(EMPTY_ADDRESS, 0)
      .encodeABI()
  }

  async function setupMockSwap() {
    mockSwap = await MockContract.new()
  }

  async function setupMockDelegate() {
    mockDelegate = await MockContract.new()
    let mockDelegateTemplate = await Delegate.new(
      mockSwap.address,
      owner,
      tradeWallet_1
    )

    //mock setRule()
    let mockDelegate_setRule = mockDelegateTemplate.contract.methods
      .setRule(EMPTY_ADDRESS, EMPTY_ADDRESS, 0, 0, 0)
      .encodeABI()
    await mockDelegate.givenMethodReturnBool(mockDelegate_setRule, true)

    //mock unsetRule()
    let mockDelegate_unsetRule = mockDelegateTemplate.contract.methods
      .unsetRule(EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockDelegate.givenMethodReturnBool(mockDelegate_unsetRule, true)

    //mock owner()
    let mockDelegate_owner = mockDelegateTemplate.contract.methods
      .owner()
      .encodeABI()
    await mockDelegate.givenMethodReturnAddress(mockDelegate_owner, owner)
  }

  async function setupMockFactory() {
    mockFactory = await MockContract.new()
    let mockFactoryTemplate = await DelegateFactory.new(mockSwap.address)

    // mock createDelegate()
    let mockFactory_createDelegate = mockFactoryTemplate.contract.methods
      .createDelegate(EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockFactory.givenMethodReturnAddress(
      mockFactory_createDelegate,
      mockDelegate.address
    )
  }

  async function setupMockIndexer() {
    mockIndexer = await MockContract.new()
    let mockIndexerTemplate = await Indexer.new(EMPTY_ADDRESS, EMPTY_ADDRESS)

    //mock setIntent()
    let mockIndexer_setIntent = mockIndexerTemplate.contract.methods
      .setIntent(EMPTY_ADDRESS, EMPTY_ADDRESS, 0, web3.utils.fromAscii(''))
      .encodeABI()
    await mockIndexer.givenMethodReturnBool(mockIndexer_setIntent, true)

    //mock unsetIntent()
    let mockIndexer_unsetIntent = mockIndexerTemplate.contract.methods
      .unsetIntent(EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockIndexer.givenMethodReturnBool(mockIndexer_unsetIntent, true)

    //mock stakeToken()
    let mockIndexer_stakeToken = mockIndexerTemplate.contract.methods
      .stakeToken()
      .encodeABI()
    await mockIndexer.givenMethodReturnAddress(
      mockIndexer_stakeToken,
      mockStakeToken.address
    )

    //mock getScore()
    mockIndexer_getScore = mockIndexerTemplate.contract.methods
      .getScore(EMPTY_ADDRESS, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
  }

  before(async () => {
    await setupMockTokens()
    await setupMockSwap()
    await setupMockIndexer()
    await setupMockDelegate()
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
      equal(val, mockDelegate.address, 'no delegate was created')
    })

    it('Test creating a delegate with non 0x0 trade wallet', async () => {
      let val = await delegateManager.createDelegate.call(tradeWallet_1)
      equal(val, mockDelegate.address, 'no delegate was created')
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
        mockDelegate.address,
        'there was an issue creating the delegate'
      )
      equal(
        val[1],
        mockDelegate.address,
        'there was an issue creating the delegate'
      )
    })

    it('Test when a create delegate event is emitted', async () => {
      let trx = await delegateManager.createDelegate(tradeWallet_1)
      emitted(trx, 'DelegateCreated', e => {
        return e.owner === owner && e.delegate == mockDelegate.address
      })
    })
  })

  describe('Test setRuleAndIntent()', async () => {
    it('Test calling setRuleAndIntent with allowance error', async () => {
      // construct delegate with no trade wallet
      await delegateManager.createDelegate(EMPTY_ADDRESS)

      //NOTE: I don't need to capture emitted delegate
      //I've mocked to always return mockDelegate.address
      let delegateAddress = mockDelegate.address
      let indexerAddress = mockIndexer.address

      let rule = [mockWETH.address, mockDAI.address, 100000, 300, 0]

      let intentAmount = 250
      let intent = [
        mockWETH.address,
        mockDAI.address,
        intentAmount,
        padAddressToLocator(delegateAddress),
      ]

      //NOTE: owner would call delegate.addAdmin(delegateManager)
      //this doesn't need to be done here because delegate is a mock

      //mock improper allowance
      await mockStakeToken.givenMethodReturnUint(
        mockStakeToken_allowance,
        intentAmount - 1
      )

      await reverted(
        delegateManager.setRuleAndIntent(
          delegateAddress,
          rule,
          intent,
          indexerAddress
        ),
        'ALLOWANCE_FUNDS_ERROR'
      )
    })

    it('Test calling setRuleAndIntent with transfer error', async () => {
      // construct delegate with no trade wallet
      await delegateManager.createDelegate(EMPTY_ADDRESS)

      //NOTE: I don't need to capture emitted delegate
      //I've mocked to always return mockDelegate.address
      let delegateAddress = mockDelegate.address
      let indexerAddress = mockIndexer.address

      let rule = [mockWETH.address, mockDAI.address, 100000, 300, 0]

      let intentAmount = 250
      let intent = [
        mockWETH.address,
        mockDAI.address,
        intentAmount,
        padAddressToLocator(delegateAddress),
      ]

      //NOTE: owner would call delegate.addAdmin(delegateManager)
      //this doesn't need to be done here because delegate is a mock

      await mockStakeToken.givenMethodReturnUint(
        mockStakeToken_allowance,
        intentAmount
      )
      //mock unsuccessful transfer
      await mockStakeToken.givenMethodReturnBool(
        mockStakeToken_transferFrom,
        false
      )

      await reverted(
        delegateManager.setRuleAndIntent(
          delegateAddress,
          rule,
          intent,
          indexerAddress
        ),
        'TRANSFER_FUNDS_ERROR'
      )
    })

    it('Test successfully calling setRuleAndIntent', async () => {
      // construct delegate with no trade wallet
      await delegateManager.createDelegate(EMPTY_ADDRESS)

      //NOTE: I don't need to capture emitted delegate
      //I've mocked to always return mockDelegate.address
      let delegateAddress = mockDelegate.address
      let indexerAddress = mockIndexer.address

      let rule = [mockWETH.address, mockDAI.address, 100000, 300, 0]

      let intentAmount = 250
      let intent = [
        mockWETH.address,
        mockDAI.address,
        intentAmount,
        padAddressToLocator(delegateAddress),
      ]

      //NOTE: owner would call delegate.addAdmin(delegateManager)
      //this doesn't need to be done here because delegate is a mock

      await mockStakeToken.givenMethodReturnUint(
        mockStakeToken_allowance,
        intentAmount
      )
      await mockStakeToken.givenMethodReturnBool(
        mockStakeToken_transferFrom,
        true
      )

      await passes(
        delegateManager.setRuleAndIntent(
          delegateAddress,
          rule,
          intent,
          indexerAddress
        )
      )
    })
  })

  describe('Test unsetRuleAndIntent()', async () => {
    it('Test calling unsetRuleAndIntent() with transfer error', async () => {
      let mockScore = 1000
      let delegateAddress = mockDelegate.address
      let indexerAddress = mockIndexer.address

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(mockIndexer_getScore, mockScore)

      //mock a failed transfer
      await mockStakeToken.givenMethodReturnBool(mockStakeToken_transfer, false)

      await reverted(
        delegateManager.unsetRuleAndIntent(
          delegateAddress,
          mockWETH.address,
          mockDAI.address,
          indexerAddress
        ),
        'TRANSFER_FUNDS_ERROR'
      )
    })

    it('Test successfully calling unsetRuleAndIntent()', async () => {
      let mockScore = 1000
      let delegateAddress = mockDelegate.address
      let indexerAddress = mockIndexer.address

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(mockIndexer_getScore, mockScore)

      //mock a successful transfer
      await mockStakeToken.givenMethodReturnBool(mockStakeToken_transfer, true)

      await passes(
        delegateManager.unsetRuleAndIntent(
          delegateAddress,
          mockWETH.address,
          mockDAI.address,
          indexerAddress
        )
      )
    })
  })
})
