const ERC20 = artifacts.require('FungibleToken')
const Swap = artifacts.require('Swap')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const DelegateFactory = artifacts.require('DelegateFactory')
const DelegateManager = artifacts.require('DelegateManager')
const { equal, notEqual, passes } = require('@airswap/test-utils').assert
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('DelegateManager Integration Tests', async accounts => {
  const STARTING_BALANCE = 700
  const INTENT_AMOUNT = 250
  let owner = accounts[0]
  let notOwner = accounts[1]
  let tradeWallet = accounts[2]
  let DAI_TOKEN
  let WETH_TOKEN
  let STAKE_TOKEN
  let swap
  let indexer
  let delegateFactory
  let delegateManager
  let delegateAddress

  async function setupTokenAmounts() {
    await STAKE_TOKEN.mint(owner, STARTING_BALANCE)
    await DAI_TOKEN.mint(owner, STARTING_BALANCE)
    await WETH_TOKEN.mint(owner, STARTING_BALANCE)

    await STAKE_TOKEN.mint(notOwner, STARTING_BALANCE)
    await DAI_TOKEN.mint(notOwner, STARTING_BALANCE)
    await WETH_TOKEN.mint(notOwner, STARTING_BALANCE)
  }

  before(async () => {
    DAI_TOKEN = await ERC20.new()
    WETH_TOKEN = await ERC20.new()
    STAKE_TOKEN = await ERC20.new()
    await setupTokenAmounts()

    swap = await Swap.new()

    delegateFactory = await DelegateFactory.new(swap.address)
    delegateManager = await DelegateManager.new(
      delegateFactory.address,
      tradeWallet
    )

    indexer = await Indexer.new(STAKE_TOKEN.address, delegateFactory.address)
    await indexer.createIndex(DAI_TOKEN.address, WETH_TOKEN.address)
  })

  describe('Test initial values', async () => {
    it('Test factory address', async () => {
      let val = await delegateManager.factory.call()
      equal(val, delegateFactory.address, 'factory was not properly set')
    })

    it('Test delegate address', async () => {
      delegateAddress = await delegateManager.delegate.call()
      notEqual(delegateAddress, EMPTY_ADDRESS)
    })
  })

  describe('Test setRuleAndIntent()', async () => {
    it('Test successfully calling setRuleAndIntent', async () => {
      let rule = [WETH_TOKEN.address, DAI_TOKEN.address, 100000, 300, 0]

      let intent = [
        DAI_TOKEN.address,
        WETH_TOKEN.address,
        INTENT_AMOUNT,
        padAddressToLocator(delegateAddress),
      ]

      //give manager admin access
      let delegate = await Delegate.at(delegateAddress)
      await delegate.addAdmin(delegateManager.address)

      //give allowance to the delegateManager to pull staking amount
      await STAKE_TOKEN.approve(delegateManager.address, INTENT_AMOUNT)

      //check the score of the manager before
      let scoreBefore = await indexer.getScore(
        DAI_TOKEN.address,
        WETH_TOKEN.address,
        delegateManager.address
      )
      equal(scoreBefore.toNumber(), 0, 'intent score is incorrect')

      await passes(
        delegateManager.setRuleAndIntent(rule, intent, indexer.address)
      )

      //check the score of the manager after
      let scoreAfter = await indexer.getScore(
        DAI_TOKEN.address,
        WETH_TOKEN.address,
        delegateManager.address
      )
      equal(scoreAfter.toNumber(), INTENT_AMOUNT, 'intent score is incorrect')

      //check owner stake balance has been reduced
      let stakeTokenBal = await STAKE_TOKEN.balanceOf(owner)
      equal(stakeTokenBal.toNumber(), STARTING_BALANCE - INTENT_AMOUNT)
    })
  })

  describe('Test unsetRuleAndIntent()', async () => {
    it('Test successfully calling unsetRuleAndIntent()', async () => {
      //check the score of the manager before
      let scoreBefore = await indexer.getScore(
        DAI_TOKEN.address,
        WETH_TOKEN.address,
        delegateManager.address
      )
      equal(scoreBefore.toNumber(), INTENT_AMOUNT, 'intent score is incorrect')

      await passes(
        delegateManager.unsetRuleAndIntent(
          DAI_TOKEN.address,
          WETH_TOKEN.address,
          indexer.address
        )
      )

      //check the score of the manager after
      let scoreAfter = await indexer.getScore(
        DAI_TOKEN.address,
        WETH_TOKEN.address,
        delegateManager.address
      )
      equal(scoreAfter.toNumber(), 0, 'intent score is incorrect')

      //check owner stake balance has been increased
      let stakeTokenBal = await STAKE_TOKEN.balanceOf(owner)

      equal(stakeTokenBal.toNumber(), STARTING_BALANCE)
    })
  })
})
