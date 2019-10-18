const ERC20 = artifacts.require('ERC20Mintable')
const Swap = artifacts.require('Swap')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const DelegateFactory = artifacts.require('DelegateFactory')
const DelegateManager = artifacts.require('DelegateManager')
const {
  equal,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('DelegateManager Integration Tests', async accounts => {
  let startingBalance = 700
  let owner = accounts[0]
  let notOwner = accounts[2]
  let tradeWallet_1 = accounts[1]
  let tradeWallet_2 = accounts[1]
  let DAI_TOKEN
  let WETH_TOKEN
  let stake_TOKEN
  let swap
  let indexer
  let delegateFactory
  let delegateManager
  let delegateAddress1
  let delegateAddress2

  async function setupTokenAmounts() {
    await stakeToken.mint(owner, startingBalance)
    await DAI_TOKEN.mint(owner, startingBalance)
    await WETH_TOKEN.mint(owner, startingBalance)

    await stakeToken.mint(notOwner, startingBalance)
    await DAI_TOKEN.mint(notOwner, startingBalance)
    await WETH_TOKEN.mint(notOwner, startingBalance)
  }

  before(async () => {
    DAI_TOKEN = await ERC20.new()
    WETH_TOKEN = await ERC20.new()
    stakeToken = await ERC20.new()
    await setupTokenAmounts()

    swap = await Swap.new()

    delegateFactory = await DelegateFactory.new(swap.address)
    delegateManager = await DelegateManager.new(delegateFactory.address)

    indexer = await Indexer.new(stakeToken.address, delegateFactory.address)
    await indexer.createIndex(WETH_TOKEN.address, DAI_TOKEN.address)
  })

  describe('Test initial values', async () => {
    it('Test factory address', async () => {
      let val = await delegateManager.factory.call()
      equal(val, delegateFactory.address, 'factory was not properly set')
    })
  })

  describe('Test createDelegate', async () => {
    it('Test creating delegates', async () => {
      let trx = await delegateManager.createDelegate(tradeWallet_1)
      emitted(trx, 'DelegateCreated', e => {
        delegateAddress1 = e.delegate
        return e.owner === owner
      })
    })

    it('Test creating another delegate', async () => {
      let trx = await delegateManager.createDelegate(tradeWallet_2)
      emitted(trx, 'DelegateCreated', e => {
        delegateAddress2 = e.delegate
        return e.owner === owner
      })
    })

    it('Test retrieval of delegates', async () => {
      //retrieve the list
      let val = await delegateManager.getOwnerAddressToDelegates.call(owner)
      equal(val.length, 2, 'there are too many items in the returned list')
      equal(
        val[0],
        delegateAddress1,
        'there was an issue creating the delegate'
      )
      equal(
        val[1],
        delegateAddress2,
        'there was an issue creating the delegate'
      )
    })
  })

  describe('Test setRuleAndIntent()', async () => {
    it('Test successfully calling setRuleAndIntent', async () => {
      let rule = [WETH_TOKEN.address, DAI_TOKEN.address, 100000, 300, 0]

      let intentAmount = 250
      let intent = [
        WETH_TOKEN.address,
        DAI_TOKEN.address,
        intentAmount,
        padAddressToLocator(delegateAddress1),
      ]

      //give manager admin access
      let delegate = await Delegate.at(delegateAddress1)
      await delegate.addAdmin(delegateManager.address)

      //give allowance to the delegateManager to pull staking amount
      await stakeToken.approve(delegateManager.address, intentAmount)

      //manager needs to give approval to the Indexer?

      await passes(
        delegateManager.setRuleAndIntent(
          delegateAddress1,
          rule,
          intent,
          indexer.address
        )
      )
    })
  })

  describe('Test unsetRuleAndIntent()', async () => {
    it('Test calling unsetRuleAndIntent on unowned delegate', async () => {
      let delegateAddress = mockDelegate.address
      let indexerAddress = mockIndexer.address
      await reverted(
        delegateManager.unsetRuleAndIntent(
          delegateAddress,
          mockWETH.address,
          mockDAI.address,
          indexerAddress,
          { from: notOwner }
        ),
        'DELEGATE_NOT_OWNED'
      )
    })

    it('Test calling unsetRuleAndIntent() with transfer error', async () => {
      let delegateAddress = mockDelegate.address
      let indexerAddress = mockIndexer.address

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
      let delegateAddress = mockDelegate.address
      let indexerAddress = mockIndexer.address

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

  describe('Test end to end mock flow', async () => {
    it('Test stakedAmount values', async () => {
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

      let stakedAmountInitial = await delegateManager.stakedAmounts.call(
        mockDAI.address,
        mockWETH.address,
        owner
      )
      equal(stakedAmountInitial.toNumber(), 0, 'improper initial staked amount')

      await passes(
        delegateManager.setRuleAndIntent(
          delegateAddress,
          rule,
          intent,
          indexerAddress
        )
      )

      let stakedAmountSet = await delegateManager.stakedAmounts.call(
        mockDAI.address,
        mockWETH.address,
        owner
      )
      equal(
        stakedAmountSet.toNumber(),
        intentAmount,
        'improper staked amount after set'
      )

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

      let stakedAmountUnset = await delegateManager.stakedAmounts.call(
        mockDAI.address,
        mockWETH.address,
        owner
      )
      equal(
        stakedAmountUnset.toNumber(),
        stakedAmountInitial.toNumber(),
        'improper staked amount after unset'
      )
    })
  })
})
