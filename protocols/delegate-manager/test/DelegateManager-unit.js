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
  let tradeWallet = accounts[1]
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
  let mockStakeToken_approve
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

    mockStakeToken_approve = await mockERC20Template.contract.methods
      .approve(EMPTY_ADDRESS, 0)
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
      tradeWallet
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

    delegateManager = await DelegateManager.new(mockFactory.address, tradeWallet)
  })

  describe('Test initial values', async () => {
    it('Test factory address', async () => {
      let val = await delegateManager.factory.call()
      equal(val, mockFactory.address, 'mockFactory was not properly set')
    })

    it('Test delegate address', async () => {
      let val = await delegateManager.delegate.call()
      equal(val, mockDelegate.address, 'delegate address was not properly set')
    })
  })

  describe('Test setRuleAndIntent()', async () => {
    it('Test calling setRuleAndIntent with allowance error', async () => {
      let delegateAddress = await delegateManager.delegate.call()
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
          rule,
          intent,
          indexerAddress
        ),
        'ALLOWANCE_FUNDS_ERROR'
      )
    })

    it('Test calling setRuleAndIntent with transfer error', async () => {
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
          rule,
          intent,
          indexerAddress
        ),
        'TRANSFER_FUNDS_ERROR'
      )
    })

    it('Test calling setRuleAndIntent with approval error', async () => {
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
      await mockStakeToken.givenMethodReturnBool(
        mockStakeToken_approve,
        false
      )

      await reverted(
        delegateManager.setRuleAndIntent(
          rule,
          intent,
          indexerAddress
        ),
        'APPROVAL_ERROR'
      )
    })

    it('Test successfully calling setRuleAndIntent', async () => {
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
      await mockStakeToken.givenMethodReturnBool(
        mockStakeToken_approve,
        true
      )

      await passes(
        delegateManager.setRuleAndIntent(
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
          mockWETH.address,
          mockDAI.address,
          indexerAddress
        )
      )
    })
  })
})
