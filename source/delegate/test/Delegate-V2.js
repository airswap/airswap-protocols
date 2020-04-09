const DelegateV2 = artifacts.require('DelegateV2')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')

const ethers = require('ethers')
const { tokenKinds, ADDRESS_ZERO } = require('@airswap/constants')
const { emptySignature } = require('@airswap/types')
const { createOrder, signOrder } = require('@airswap/utils')
const { padAddressToLocator } = require('@airswap/test-utils').padding
const {
  passes,
  equal,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { GANACHE_PROVIDER } = require('@airswap/test-utils').constants

contract('Delegate Integration Tests', async accounts => {
  const STARTING_BALANCE = 100000000
  const notOwner = accounts[0]
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]
  const carolAddress = accounts[3]
  const aliceTradeWallet = accounts[4]
  const bobSigner = new ethers.providers.JsonRpcProvider(
    GANACHE_PROVIDER
  ).getSigner(bobAddress)
  const PROTOCOL = '0x0002'
  let stakingToken
  let tokenDAI
  let tokenWETH
  let daiAddress
  let wethAddress
  let aliceDelegate
  let swap
  let swapAddress
  let indexer

  async function checkLinkedList(senderToken, signerToken, correctIDs) {
    // pad correctIDs with null values for null pointers
    correctIDs = [0].concat(correctIDs).concat([0])

    // get the first rule: rule 3. Now iterate through the rules using 'nextRuleID'
    let ruleID = await aliceDelegate.firstRuleID.call(senderToken, signerToken)
    let rule

    // loop through the list in the contract, checking it is correctly ordered
    for (let i = 1; i <= correctIDs.length - 2; i++) {
      // check the ruleID is right
      equal(
        ruleID,
        correctIDs[i],
        'Link list rule wrong. Should be: ' +
          correctIDs[i] +
          ' but got: ' +
          ruleID
      )
      // fetch the rule, and from that the next rule/previous rule
      rule = await aliceDelegate.rules.call(ruleID)
      equal(
        rule['prevRuleID'].toNumber(),
        correctIDs[i - 1],
        'prev rule incorrectly set'
      )
      equal(
        rule['nextRuleID'].toNumber(),
        correctIDs[i + 1],
        'next rule incorrectly set'
      )
      ruleID = rule['nextRuleID'].toNumber()
    }
  }

  async function setupTokens() {
    tokenWETH = await FungibleToken.new()
    tokenDAI = await FungibleToken.new()
    stakingToken = await FungibleToken.new()

    daiAddress = tokenDAI.address
    wethAddress = tokenWETH.address

    await tokenWETH.mint(aliceTradeWallet, STARTING_BALANCE)
    await tokenDAI.mint(aliceTradeWallet, STARTING_BALANCE)
    await stakingToken.mint(aliceAddress, STARTING_BALANCE)
  }

  async function setupIndexer() {
    indexer = await Indexer.new(stakingToken.address)
    await indexer.createIndex(tokenDAI.address, tokenWETH.address, PROTOCOL)
  }

  async function setupSwap() {
    const types = await Types.new()
    await Swap.link('Types', types.address)

    const transferHandlerRegistry = await TransferHandlerRegistry.new()
    const erc20TransferHandler = await ERC20TransferHandler.new()
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC20,
      erc20TransferHandler.address
    )

    swap = await Swap.new(transferHandlerRegistry.address)
    swapAddress = swap.address
  }

  before('Setup', async () => {
    await setupTokens()
    await setupIndexer()
    await setupSwap()

    aliceDelegate = await DelegateV2.new(
      swapAddress,
      indexer.address,
      aliceAddress,
      aliceTradeWallet,
      PROTOCOL
    )
  })

  describe('Test constructor', async () => {
    it('should set the swap contract address', async () => {
      const val = await aliceDelegate.swapContract.call()
      equal(val, swapAddress, 'swap address is incorrect')
    })

    it('should set the indexer contract address', async () => {
      const val = await aliceDelegate.indexer.call()
      equal(val, indexer.address, 'indexer address is incorrect')
    })

    it('should set the tradeWallet address', async () => {
      const val = await aliceDelegate.tradeWallet.call()
      equal(val, aliceTradeWallet, 'trade wallet is incorrect')
    })

    it('should set the protocol value', async () => {
      const val = await aliceDelegate.protocol.call()
      equal(val, PROTOCOL, 'protocol is incorrect')
    })

    it('should set the owner value', async () => {
      const val = await aliceDelegate.owner.call()
      equal(val, aliceAddress, 'owner is incorrect')
    })

    it('should set the owner and trade wallet if none are provided', async () => {
      const newDelegate = await DelegateV2.new(
        swapAddress,
        indexer.address,
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        PROTOCOL,
        {
          from: notOwner,
        }
      )

      const owner = await newDelegate.owner.call()
      const tradeWallet = await newDelegate.tradeWallet.call()

      equal(owner, notOwner, 'owner is incorrect')
      equal(tradeWallet, notOwner, 'trade wallet is incorrect')
    })
  })

  describe('Test createRuleAndSetIntent', async () => {
    let senderDaiAmount = 1000
    let signerWethAmount = 5
    let stakeAmount = 50

    it('should not let a non-owner set a rule', async () => {
      await reverted(
        aliceDelegate.createRuleAndSetIntent(
          daiAddress,
          wethAddress,
          senderDaiAmount,
          signerWethAmount,
          stakeAmount,
          {
            from: notOwner,
          }
        ),
        'Ownable: caller is not the owner'
      )
    })

    it('should not let a rule be created with amount 0', async () => {
      await reverted(
        aliceDelegate.createRuleAndSetIntent(
          daiAddress,
          wethAddress,
          0,
          signerWethAmount,
          stakeAmount,
          {
            from: aliceAddress,
          }
        ),
        'AMOUNTS_CANNOT_BE_0'
      )

      await reverted(
        aliceDelegate.createRuleAndSetIntent(
          daiAddress,
          wethAddress,
          senderDaiAmount,
          0,
          stakeAmount,
          {
            from: aliceAddress,
          }
        ),
        'AMOUNTS_CANNOT_BE_0'
      )
    })

    it('should not succeed if alice hasnt given staking token allowance', async () => {
      await reverted(
        aliceDelegate.createRuleAndSetIntent(
          daiAddress,
          wethAddress,
          senderDaiAmount,
          signerWethAmount,
          stakeAmount,
          {
            from: aliceAddress,
          }
        ),
        'ERC20: transfer amount exceeds allowance'
      )
    })

    it('should not be able to set intent on a non-existent index', async () => {
      await stakingToken.approve(aliceDelegate.address, STARTING_BALANCE, {
        from: aliceAddress,
      })

      await reverted(
        aliceDelegate.createRuleAndSetIntent(
          daiAddress,
          wethAddress,
          senderDaiAmount,
          signerWethAmount,
          stakeAmount,
          {
            from: aliceAddress,
          }
        ),
        'INDEX_DOES_NOT_EXIST'
      )
    })

    it('should succeed with allowance and an index created', async () => {
      await stakingToken.approve(aliceDelegate.address, STARTING_BALANCE, {
        from: aliceAddress,
      })

      await indexer.createIndex(wethAddress, daiAddress, PROTOCOL)

      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexer.address)

      const tx = await aliceDelegate.createRuleAndSetIntent(
        daiAddress,
        wethAddress,
        senderDaiAmount,
        signerWethAmount,
        stakeAmount,
        {
          from: aliceAddress,
        }
      )

      passes(tx)
      emitted(tx, 'CreateRule', e => {
        return (
          e.owner === aliceAddress &&
          e.ruleID.toNumber() === 1 &&
          e.senderToken === daiAddress &&
          e.signerToken === wethAddress &&
          e.senderAmount.toNumber() === senderDaiAmount &&
          e.signerAmount.toNumber() === signerWethAmount
        )
      })

      const aliceBalanceAfter = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceAfter = await stakingToken.balanceOf(indexer.address)

      equal(
        aliceBalanceBefore.toNumber(),
        aliceBalanceAfter.toNumber() + stakeAmount,
        'Alices balance did not decrease'
      )
      equal(
        indexerBalanceBefore.toNumber(),
        indexerBalanceAfter.toNumber() - stakeAmount,
        'Indexer balance did not increase'
      )

      const intents = await indexer.getLocators(
        wethAddress,
        daiAddress,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )
      equal(
        intents['locators'][0],
        padAddressToLocator(aliceDelegate.address),
        'locator set incorrectly'
      )
      equal(
        intents['scores'][0].toNumber(),
        stakeAmount,
        'stake set incorrectly'
      )
      await checkLinkedList(daiAddress, wethAddress, [1])
    })

    it('should increase stake with a new rule', async () => {
      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexer.address)

      senderDaiAmount = 500
      signerWethAmount = 2
      stakeAmount = 80

      const tx = await aliceDelegate.createRuleAndSetIntent(
        daiAddress,
        wethAddress,
        senderDaiAmount,
        signerWethAmount,
        stakeAmount,
        {
          from: aliceAddress,
        }
      )

      passes(tx)
      emitted(tx, 'CreateRule', e => {
        return (
          e.owner === aliceAddress &&
          e.ruleID.toNumber() === 2 &&
          e.senderToken === daiAddress &&
          e.signerToken === wethAddress &&
          e.senderAmount.toNumber() === senderDaiAmount &&
          e.signerAmount.toNumber() === signerWethAmount
        )
      })

      const aliceBalanceAfter = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceAfter = await stakingToken.balanceOf(indexer.address)

      equal(
        aliceBalanceBefore.toNumber(),
        aliceBalanceAfter.toNumber() + 30, // 80 staked now, 50 were staked before
        'Alices balance did not decrease'
      )
      equal(
        indexerBalanceBefore.toNumber(),
        indexerBalanceAfter.toNumber() - 30, // 80 staked now, 50 were staked before
        'Indexer balance did not increase'
      )

      const intents = await indexer.getLocators(
        wethAddress,
        daiAddress,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )
      equal(
        intents['locators'][0],
        padAddressToLocator(aliceDelegate.address),
        'locator set incorrectly'
      )
      equal(
        intents['scores'][0].toNumber(),
        stakeAmount,
        'stake set incorrectly'
      )
      await checkLinkedList(daiAddress, wethAddress, [2, 1])
    })

    it('should decrease stake with a new rule', async () => {
      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexer.address)

      senderDaiAmount = 660
      signerWethAmount = 3
      stakeAmount = 1

      const tx = await aliceDelegate.createRuleAndSetIntent(
        daiAddress,
        wethAddress,
        senderDaiAmount,
        signerWethAmount,
        stakeAmount,
        {
          from: aliceAddress,
        }
      )

      passes(tx)
      emitted(tx, 'CreateRule', e => {
        return (
          e.owner === aliceAddress &&
          e.ruleID.toNumber() === 3 &&
          e.senderToken === daiAddress &&
          e.signerToken === wethAddress &&
          e.senderAmount.toNumber() === senderDaiAmount &&
          e.signerAmount.toNumber() === signerWethAmount
        )
      })

      const aliceBalanceAfter = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceAfter = await stakingToken.balanceOf(indexer.address)

      equal(
        aliceBalanceBefore.toNumber(),
        aliceBalanceAfter.toNumber() - 79, // 1 staked now, 80 were staked before
        'Alices balance did not decrease'
      )
      equal(
        indexerBalanceBefore.toNumber(),
        indexerBalanceAfter.toNumber() + 79, // 1 staked now, 80 were staked before
        'Indexer balance did not increase'
      )

      const intents = await indexer.getLocators(
        wethAddress,
        daiAddress,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )
      equal(
        intents['locators'][0],
        padAddressToLocator(aliceDelegate.address),
        'locator set incorrectly'
      )
      equal(
        intents['scores'][0].toNumber(),
        stakeAmount,
        'stake set incorrectly'
      )

      await checkLinkedList(daiAddress, wethAddress, [2, 3, 1])
    })
  })

  describe.skip('Test deleteRuleAndUnsetIntent')
  describe.skip('Test provideOrder')
  describe.skip('Test getMaxQuote')
})
