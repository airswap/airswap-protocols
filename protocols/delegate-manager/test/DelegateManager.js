const ERC20 = artifacts.require('ERC20Mintable')
const Swap = artifacts.require('Swap')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const DelegateFactory = artifacts.require('DelegateFactory')
const DelegateManager = artifacts.require('DelegateManager')
const { equal, passes, emitted } = require('@airswap/test-utils').assert
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('DelegateManager Integration Tests', async accounts => {
  let startingBalance = 700
  let intentAmount = 250
  let owner = accounts[0]
  let notOwner = accounts[2]
  let tradeWallet_1 = accounts[1]
  let tradeWallet_2 = accounts[1]
  let DAI_TOKEN
  let WETH_TOKEN
  let stakeToken
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

      //check the score of the manager before
      let scoreBefore = await indexer.getScore(
        WETH_TOKEN.address,
        DAI_TOKEN.address,
        delegateManager.address
      )
      equal(scoreBefore.toNumber(), 0, 'intent score is incorrect')

      await passes(
        delegateManager.setRuleAndIntent(
          delegateAddress1,
          rule,
          intent,
          indexer.address
        )
      )

      //check the score of the manager after
      let scoreAfter = await indexer.getScore(
        WETH_TOKEN.address,
        DAI_TOKEN.address,
        delegateManager.address
      )
      equal(scoreAfter.toNumber(), intentAmount, 'intent score is incorrect')
    })
  })

  describe('Test unsetRuleAndIntent()', async () => {
    it('Test successfully calling unsetRuleAndIntent()', async () => {
      //check the score of the manager before
      let scoreBefore = await indexer.getScore(
        WETH_TOKEN.address,
        DAI_TOKEN.address,
        delegateManager.address
      )
      equal(scoreBefore.toNumber(), intentAmount, 'intent score is incorrect')

      await passes(
        delegateManager.unsetRuleAndIntent(
          delegateAddress1,
          WETH_TOKEN.address,
          DAI_TOKEN.address,
          indexer.address
        )
      )

      //check the score of the manager after
      let scoreAfter = await indexer.getScore(
        WETH_TOKEN.address,
        DAI_TOKEN.address,
        delegateManager.address
      )
      equal(scoreAfter.toNumber(), 0, 'intent score is incorrect')
    })
  })
})
