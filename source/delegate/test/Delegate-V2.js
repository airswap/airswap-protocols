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
  let stakingTokenAddr
  let aliceDelegate
  let aliceDeleAddress
  let swap
  let swapAddress
  let indexer
  let indexerAddress

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
    stakingTokenAddr = stakingToken.address

    await stakingToken.mint(aliceAddress, STARTING_BALANCE)
  }

  async function setupIndexer() {
    indexer = await Indexer.new(stakingTokenAddr)
    indexerAddress = indexer.address
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
      indexerAddress,
      aliceAddress,
      aliceTradeWallet,
      PROTOCOL
    )
    aliceDeleAddress = aliceDelegate.address
  })

  describe('Test constructor', async () => {
    it('Should set the swap contract address', async () => {
      const val = await aliceDelegate.swapContract.call()
      equal(val, swapAddress, 'swap address is incorrect')
    })

    it('Should set the indexer contract address', async () => {
      const val = await aliceDelegate.indexer.call()
      equal(val, indexerAddress, 'indexer address is incorrect')
    })

    it('Should set the tradeWallet address', async () => {
      const val = await aliceDelegate.tradeWallet.call()
      equal(val, aliceTradeWallet, 'trade wallet is incorrect')
    })

    it('Should set the protocol value', async () => {
      const val = await aliceDelegate.protocol.call()
      equal(val, PROTOCOL, 'protocol is incorrect')
    })

    it('Should set the owner value', async () => {
      const val = await aliceDelegate.owner.call()
      equal(val, aliceAddress, 'owner is incorrect')
    })

    it('Should set the owner and trade wallet if none are provided', async () => {
      const newDelegate = await DelegateV2.new(
        swapAddress,
        indexerAddress,
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

    it('Should not let a non-owner set a rule', async () => {
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

    it('Should not let a rule be created with amount 0', async () => {
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

    it('Should not succeed if alice hasnt given staking token allowance', async () => {
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

    it('Should not be able to set intent on a non-existent index', async () => {
      await stakingToken.approve(aliceDeleAddress, STARTING_BALANCE, {
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

    it('Should succeed with allowance and an index created', async () => {
      await indexer.createIndex(wethAddress, daiAddress, PROTOCOL)

      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexerAddress)

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
      const indexerBalanceAfter = await stakingToken.balanceOf(indexerAddress)

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
        padAddressToLocator(aliceDeleAddress),
        'locator set incorrectly'
      )
      equal(
        intents['scores'][0].toNumber(),
        stakeAmount,
        'stake set incorrectly'
      )
      await checkLinkedList(daiAddress, wethAddress, [1])
    })

    it('Should increase stake with a new rule', async () => {
      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexerAddress)

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
      const indexerBalanceAfter = await stakingToken.balanceOf(indexerAddress)

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
        padAddressToLocator(aliceDeleAddress),
        'locator set incorrectly'
      )
      equal(
        intents['scores'][0].toNumber(),
        stakeAmount,
        'stake set incorrectly'
      )
      await checkLinkedList(daiAddress, wethAddress, [2, 1])
    })

    it('Should decrease stake with a new rule', async () => {
      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexerAddress)

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
      const indexerBalanceAfter = await stakingToken.balanceOf(indexerAddress)

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
        padAddressToLocator(aliceDeleAddress),
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

  describe('Test setIntent', async () => {
    const stakeAmount = 100
    it('Should not let a non-owner set intent', async () => {
      await reverted(
        aliceDelegate.setIntent(daiAddress, wethAddress, stakeAmount, {
          from: notOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Should not let intent be set on a market with no rules', async () => {
      await reverted(
        aliceDelegate.setIntent(wethAddress, wethAddress, stakeAmount, {
          from: aliceAddress,
        }),
        'NO_RULE_EXISTS'
      )
    })

    it('Should set intent for a market successfully', async () => {
      // create the index
      await indexer.createIndex(daiAddress, stakingTokenAddr, PROTOCOL)

      // create a rule for a market
      await aliceDelegate.createRule(stakingTokenAddr, daiAddress, 5, 5, {
        from: aliceAddress,
      })

      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexerAddress)

      await aliceDelegate.setIntent(stakingTokenAddr, daiAddress, stakeAmount, {
        from: aliceAddress,
      })

      const aliceBalanceAfter = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceAfter = await stakingToken.balanceOf(indexerAddress)

      const intents = await indexer.getLocators(
        daiAddress,
        stakingTokenAddr,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )

      // no intents on the market
      equal(
        intents['locators'][0],
        padAddressToLocator(aliceDeleAddress),
        'locator incorrect'
      )
      equal(intents['scores'][0], stakeAmount, 'score set incorrectly')

      equal(
        aliceBalanceBefore.toNumber() - stakeAmount,
        aliceBalanceAfter.toNumber(),
        'Alice incorrect stake amount'
      )
      equal(
        indexerBalanceBefore.toNumber() + stakeAmount,
        indexerBalanceAfter.toNumber(),
        'Indexer incorrect stake amount'
      )
    })
  })

  describe('Test unsetIntent', async () => {
    it('Should not let a non-owner unset intent', async () => {
      await reverted(
        aliceDelegate.unsetIntent(daiAddress, wethAddress, {
          from: notOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Should unset intent for a market successfully', async () => {
      // previous section staked 100 tokens on this market
      const stakeAmount = 100

      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexerAddress)

      await aliceDelegate.unsetIntent(stakingTokenAddr, daiAddress, {
        from: aliceAddress,
      })

      const aliceBalanceAfter = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceAfter = await stakingToken.balanceOf(indexerAddress)

      const intents = await indexer.getLocators(
        daiAddress,
        stakingTokenAddr,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )

      // no intents on the market
      equal(intents['locators'].length, 0, 'locators should be empty')

      equal(
        aliceBalanceBefore.toNumber() + stakeAmount,
        aliceBalanceAfter.toNumber(),
        'Alice incorrect stake amount'
      )
      equal(
        indexerBalanceBefore.toNumber() - stakeAmount,
        indexerBalanceAfter.toNumber(),
        'Indexer incorrect stake amount'
      )
    })
  })

  describe('Test deleteRuleAndUnsetIntent', async () => {
    it('Should not let a non-owner set a rule', async () => {
      await reverted(
        aliceDelegate.deleteRuleAndUnsetIntent(1, {
          from: notOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Should not succeed for a non-existent rule', async () => {
      await reverted(
        aliceDelegate.deleteRuleAndUnsetIntent(0, {
          from: aliceAddress,
        }),
        'RULE_NOT_ACTIVE'
      )

      await reverted(
        aliceDelegate.deleteRuleAndUnsetIntent(5, {
          from: aliceAddress,
        }),
        'RULE_NOT_ACTIVE'
      )
    })

    it('Should delete a rule and unset intent for the entire market', async () => {
      let intents = await indexer.getLocators(
        wethAddress,
        daiAddress,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )
      const aliceStaked = intents['scores'][0].toNumber()

      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexerAddress)

      const tx = await aliceDelegate.deleteRuleAndUnsetIntent(1, {
        from: aliceAddress,
      })

      const aliceBalanceAfter = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceAfter = await stakingToken.balanceOf(indexerAddress)

      emitted(tx, 'DeleteRule', e => {
        return e.owner === aliceAddress && e.ruleID.toNumber() === 1
      })

      equal(
        aliceBalanceBefore.toNumber() + aliceStaked,
        aliceBalanceAfter.toNumber(),
        'Alice stake not returned'
      )
      equal(
        indexerBalanceBefore.toNumber() - aliceStaked,
        indexerBalanceAfter.toNumber(),
        'Indexer balance incorrect'
      )

      // rule 1 no longer on the delegate
      await checkLinkedList(daiAddress, wethAddress, [2, 3])

      intents = await indexer.getLocators(
        wethAddress,
        daiAddress,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )

      // no intents on the market
      equal(intents['locators'].length, 0, 'locators should be empty')
    })

    it('Should delete a rule and unset intent with 0 stake', async () => {
      // market has no intents
      let intents = await indexer.getLocators(
        wethAddress,
        daiAddress,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )
      equal(intents['locators'].length, 0, 'locators should be empty')

      const aliceBalanceBefore = await stakingToken.balanceOf(aliceAddress)
      const indexerBalanceBefore = await stakingToken.balanceOf(indexerAddress)

      // add an intent first
      await aliceDelegate.setIntent(daiAddress, wethAddress, 0, {
        from: aliceAddress,
      })

      equal(
        aliceBalanceBefore.toNumber(),
        (await stakingToken.balanceOf(aliceAddress)).toNumber(),
        'alices balance shouldnt have changed'
      )
      equal(
        indexerBalanceBefore.toNumber(),
        (await stakingToken.balanceOf(indexerAddress)).toNumber(),
        'indexer balance shouldnt have changed'
      )

      // now alice has an intent on the indexer
      intents = await indexer.getLocators(
        wethAddress,
        daiAddress,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )
      equal(
        intents['locators'][0],
        padAddressToLocator(aliceDeleAddress),
        'locator set incorrectly'
      )

      // check the current state of the linked list
      await checkLinkedList(daiAddress, wethAddress, [2, 3])

      // now delete rule 2 and unset intent
      await aliceDelegate.deleteRuleAndUnsetIntent(2, {
        from: aliceAddress,
      })

      // check the current state of the linked list
      await checkLinkedList(daiAddress, wethAddress, [3])

      // check intent is unset
      intents = await indexer.getLocators(
        wethAddress,
        daiAddress,
        PROTOCOL,
        ADDRESS_ZERO,
        1
      )
      equal(intents['locators'].length, 0, 'locators should be empty')

      // check balances still unchanged
      equal(
        aliceBalanceBefore.toNumber(),
        (await stakingToken.balanceOf(aliceAddress)).toNumber(),
        'alices balance shouldnt have changed'
      )
      equal(
        indexerBalanceBefore.toNumber(),
        (await stakingToken.balanceOf(indexerAddress)).toNumber(),
        'indexer balance shouldnt have changed'
      )
    })
  })

  describe('Test getMaxQuote', async () => {
    it('Should return 0 for a market with no rule', async () => {
      // show this market has no rules
      const ruleID = await aliceDelegate.firstRuleID.call(
        wethAddress,
        daiAddress
      )
      equal(ruleID, 0, 'Market should have no rules')

      // fetch the max quote for the market
      const maxQuote = await aliceDelegate.getMaxQuote.call(
        wethAddress,
        daiAddress
      )

      equal(maxQuote['senderAmount'].toNumber(), 0, 'Quote should be 0')
      equal(maxQuote['signerAmount'].toNumber(), 0, 'Quote should be 0')
    })

    it('Should return 0 if the tradewallet has no balance', async () => {
      // show this time the market has rules
      await checkLinkedList(daiAddress, wethAddress, [3])

      // check sender token balance is 0
      const balance = await tokenDAI.balanceOf.call(aliceTradeWallet)
      equal(balance.toNumber(), 0, 'balance should be 0')

      // check sender token allowance is 0
      const allowance = await tokenDAI.allowance.call(
        aliceTradeWallet,
        swapAddress
      )
      equal(allowance.toNumber(), 0, 'allowance should be 0')

      // fetch the max quote for the market
      const maxQuote = await aliceDelegate.getMaxQuote.call(
        daiAddress,
        wethAddress
      )

      equal(maxQuote['senderAmount'].toNumber(), 0, 'Quote should be 0')
      equal(maxQuote['signerAmount'].toNumber(), 0, 'Quote should be 0')
    })

    it('Should return 0 if the tradewallet has no allowance', async () => {
      // show this time the market has rules
      await checkLinkedList(daiAddress, wethAddress, [3])

      // check sender token allowance is 0
      const allowance = await tokenDAI.allowance.call(
        aliceTradeWallet,
        swapAddress
      )
      equal(allowance.toNumber(), 0, 'allowance should be 0')

      // mint tokens to the trade wallet
      await tokenDAI.mint(aliceTradeWallet, 1000)
      const balance = await tokenDAI.balanceOf.call(aliceTradeWallet)
      equal(balance.toNumber(), 1000, 'balance is incorrect')

      // fetch the max quote for the market
      const maxQuote = await aliceDelegate.getMaxQuote.call(
        daiAddress,
        wethAddress
      )

      equal(maxQuote['senderAmount'].toNumber(), 0, 'Quote should be 0')
      equal(maxQuote['signerAmount'].toNumber(), 0, 'Quote should be 0')
    })

    it('Should return max possible if balance/allowance are limited', async () => {
      // alice has a DAI balance of 1000 and allowance of 0, per the previous test
      // there is 1 rule on DAI/WETH: rule 3

      // approve 1100
      await tokenDAI.approve(swapAddress, 1100, {
        from: aliceTradeWallet,
      })

      // check the amounts on rule 3 are 660 DAI for 3 WETH
      const rule = await aliceDelegate.rules.call(3)
      equal(
        rule['senderAmount'].toNumber(),
        660,
        'sender amount incorrectly set'
      )
      equal(rule['signerAmount'].toNumber(), 3, 'signer amount incorrectly set')

      // add 2 more rules:
      await aliceDelegate.createRule(daiAddress, wethAddress, 1000, 5, {
        from: aliceAddress,
      })
      await aliceDelegate.createRule(daiAddress, wethAddress, 500, 2, {
        from: aliceAddress,
      })
      // rule 5: 250 DAI/WETH, rule 3: 220 DAI/WETH, rule 4: 200 DAI/WETH
      await checkLinkedList(daiAddress, wethAddress, [6, 3, 5])

      // fetch the max quote for the market
      const maxQuote = await aliceDelegate.getMaxQuote.call(
        daiAddress,
        wethAddress
      )

      // sender balance is 1000 and allowance is 1100, so limit of 1000
      // therefore: all of the first rule (500), and 500 of the 660 in the second rule
      equal(
        maxQuote['senderAmount'].toNumber(),
        500 + 500,
        'Sender amount incorrect'
      )
      //
      equal(
        maxQuote['signerAmount'].toNumber(),
        2 + Math.ceil((3 * 500) / 660),
        'Signer amount incorrect'
      )
    })

    it('Should return full rule if balance/allowance are large enough', async () => {
      // mint loads and approve loads
      await tokenDAI.approve(swapAddress, 100000000, {
        from: aliceTradeWallet,
      })
      await tokenDAI.mint(aliceTradeWallet, 100000000)

      // fetch the max quote for the market
      const maxQuote = await aliceDelegate.getMaxQuote.call(
        daiAddress,
        wethAddress
      )

      // sender balance is 1000 and allowance is 1100, so limit of 1000
      // therefore: all of the first rule (500), and 500 of the 660 in the second rule
      equal(
        maxQuote['senderAmount'].toNumber(),
        500 + 660 + 1000,
        'Sender amount incorrect'
      )
      //
      equal(
        maxQuote['signerAmount'].toNumber(),
        2 + 3 + 5,
        'Signer amount incorrect'
      )
    })
  })

  describe('Test provideOrder', async () => {
    it('Should fail if no signature is sent', async () => {
      const order = createOrder({
        signer: {
          wallet: bobAddress,
          amount: 500,
          token: wethAddress,
        },
        sender: {
          wallet: aliceTradeWallet,
          amount: 500,
          token: daiAddress,
        },
      })

      order.signature = emptySignature

      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'SIGNATURE_MUST_BE_SENT'
      )
    })

    it('Should fail if sender token is not ERC20', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: bobAddress,
            amount: 500,
            token: wethAddress,
          },
          sender: {
            wallet: aliceTradeWallet,
            amount: 500,
            token: daiAddress,
            kind: '0x80ac58cd',
          },
        }),
        bobSigner,
        swapAddress
      )

      await reverted(
        aliceDelegate.provideOrder(order, {
          from: bobAddress,
        }),
        'SENDER_KIND_MUST_BE_ERC20'
      )
    })

    it('Should fail if signer token is not ERC20', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: bobAddress,
            amount: 500,
            token: wethAddress,
            kind: '0x80ac58cd',
          },
          sender: {
            wallet: aliceTradeWallet,
            amount: 500,
            token: daiAddress,
          },
        }),
        bobSigner,
        swapAddress
      )

      await reverted(
        aliceDelegate.provideOrder(order, {
          from: bobAddress,
        }),
        'SIGNER_KIND_MUST_BE_ERC20'
      )
    })

    it('Should fail if signer token is not ERC20', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: bobAddress,
            amount: 500,
            token: wethAddress,
          },
          sender: {
            wallet: aliceTradeWallet,
            amount: 500,
            token: stakingTokenAddr,
          },
        }),
        bobSigner,
        swapAddress
      )

      await reverted(
        aliceDelegate.provideOrder(order, {
          from: bobAddress,
        }),
        'TOKEN_PAIR_INACTIVE'
      )
    })
  })
})
