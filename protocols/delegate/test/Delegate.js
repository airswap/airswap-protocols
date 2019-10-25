const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Indexer = artifacts.require('Indexer')
const DelegateFactory = artifacts.require('DelegateFactory')
const FungibleToken = artifacts.require('FungibleToken')
const {
  emitted,
  reverted,
  equal,
  ok,
  passes,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const {
  getTimestampPlusDays,
  advanceTime,
} = require('@airswap/test-utils').time
const { orders } = require('@airswap/order-utils')
const {
  EMPTY_ADDRESS,
  SECONDS_IN_DAY,
} = require('@airswap/order-utils').constants

contract('Delegate Integration Tests', async accounts => {
  const STARTING_BALANCE = 700
  const INTENT_AMOUNT = 250
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]
  const carolAddress = accounts[3]
  const aliceTradeWallet = accounts[4]

  let stakingToken
  let tokenDAI
  let tokenWETH
  let aliceDelegate
  let swapContract
  let swapAddress
  let indexer
  let delegateFactory

  orders.setKnownAccounts([aliceAddress, bobAddress, carolAddress])

  async function setupTokens() {
    tokenWETH = await FungibleToken.new()
    tokenDAI = await FungibleToken.new()
    stakingToken = await FungibleToken.new()

    await tokenWETH.mint(aliceAddress, STARTING_BALANCE)
    await tokenDAI.mint(aliceAddress, STARTING_BALANCE)
    await stakingToken.mint(aliceAddress, STARTING_BALANCE)
  }

  async function setupFactory() {
    delegateFactory = await DelegateFactory.new(
      swapContract.address,
      indexer.address
    )
  }

  async function setupIndexer() {
    indexer = await Indexer.new(stakingToken.address)
    await indexer.createIndex(tokenDAI.address, tokenWETH.address)
  }

  before('Setup', async () => {
    // link types to swap
    await Swap.link(Types, (await Types.new()).address)
    // now deploy swap
    swapContract = await Swap.new()
    swapAddress = swapContract.address

    orders.setVerifyingContract(swapAddress)

    await setupTokens()
    await setupIndexer()
    await setupFactory()

    let trx = await delegateFactory.createDelegate(
      aliceAddress,
      aliceTradeWallet
    )
    let aliceDelegateAddress
    emitted(trx, 'CreateDelegate', e => {
      //capture the delegate address
      aliceDelegateAddress = e.delegateContract
      return e.delegateContractOwner === aliceAddress
    })
    aliceDelegate = await Delegate.at(aliceDelegateAddress)
  })

  describe('Checks setTradeWallet', async () => {
    it('Does not set a 0x0 trade wallet', async () => {
      await reverted(
        aliceDelegate.setTradeWallet(EMPTY_ADDRESS, { from: aliceAddress }),
        'TRADE_WALLET_REQUIRED'
      )
    })

    it('Does set a new valid trade wallet address', async () => {
      // set trade address to carol
      await aliceDelegate.setTradeWallet(carolAddress, { from: aliceAddress })

      // check it set
      let val = await aliceDelegate.tradeWallet.call()
      equal(val, carolAddress, 'trade wallet is incorrect')

      //change it back
      await aliceDelegate.setTradeWallet(aliceTradeWallet, {
        from: aliceAddress,
      })
    })

    it('Non-owner cannot set a new address', async () => {
      await reverted(
        aliceDelegate.setTradeWallet(carolAddress, { from: carolAddress })
      )
    })
  })

  describe('Checks set and unset rule', async () => {
    it('Set and unset a rule for WETH/DAI', async () => {
      await aliceDelegate.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300,
        0,
        { from: aliceAddress }
      )
      equal(
        await aliceDelegate.getSignerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        300
      )
      await aliceDelegate.unsetRule(tokenWETH.address, tokenDAI.address, {
        from: aliceAddress,
      })
      equal(
        await aliceDelegate.getSignerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        0
      )
    })
  })

  describe('Test setRuleAndIntent()', async () => {
    it('Test successfully calling setRuleAndIntent', async () => {
      let rule = [100000, 300, 0]

      //give allowance to the delegate to pull staking amount
      await stakingToken.approve(aliceDelegate.address, INTENT_AMOUNT, {
        from: aliceAddress,
      })

      //check the score of the delegate before
      let scoreBefore = await indexer.getStakeAmount(
        aliceDelegate.address,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(scoreBefore.toNumber(), 0, 'intent score is incorrect')

      await passes(
        aliceDelegate.setRuleAndIntent(
          tokenWETH.address,
          tokenDAI.address,
          rule,
          INTENT_AMOUNT,
          {
            from: aliceAddress,
          }
        )
      )

      //check the score of the manager after
      let scoreAfter = await indexer.getStakeAmount(
        aliceDelegate.address,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(scoreAfter.toNumber(), INTENT_AMOUNT, 'intent score is incorrect')

      //check owner stake balance has been reduced
      let stakingTokenBal = await stakingToken.balanceOf(aliceAddress)
      equal(stakingTokenBal.toNumber(), STARTING_BALANCE - INTENT_AMOUNT)
    })
  })

  describe('Test unsetRuleAndIntent()', async () => {
    it('Test successfully calling unsetRuleAndIntent()', async () => {
      //check the score of the manager before
      let scoreBefore = await indexer.getStakeAmount(
        aliceDelegate.address,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(scoreBefore.toNumber(), INTENT_AMOUNT, 'intent score is incorrect')

      await passes(
        aliceDelegate.unsetRuleAndIntent(tokenDAI.address, tokenWETH.address, {
          from: aliceAddress,
        })
      )

      //check the score of the manager after
      let scoreAfter = await indexer.getStakeAmount(
        aliceDelegate.address,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(scoreAfter.toNumber(), 0, 'intent score is incorrect')

      //check owner stake balance has been increased
      let stakingTokenBal = await stakingToken.balanceOf(aliceAddress)

      equal(stakingTokenBal.toNumber(), STARTING_BALANCE)
    })
  })

  describe('Checks pricing logic from the Delegate', async () => {
    it('Send up to 100K WETH for DAI at 300 DAI/WETH', async () => {
      await aliceDelegate.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300,
        0,
        { from: aliceAddress }
      )
      equal(
        await aliceDelegate.getSignerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        300
      )
    })

    it('Send up to 100K DAI for WETH at 0.0032 WETH/DAI', async () => {
      await aliceDelegate.setRule(
        tokenDAI.address,
        tokenWETH.address,
        100000,
        32,
        4,
        { from: aliceAddress }
      )
      equal(
        await aliceDelegate.getSignerSideQuote.call(
          100000,
          tokenDAI.address,
          tokenWETH.address
        ),
        320
      )
    })

    it('Send up to 100K WETH for DAI at 300.005 DAI/WETH', async () => {
      await aliceDelegate.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300005,
        3,
        { from: aliceAddress }
      )
      equal(
        await aliceDelegate.getSignerSideQuote.call(
          20000,
          tokenWETH.address,
          tokenDAI.address
        ),
        6000100
      )
      await aliceDelegate.unsetRule(tokenWETH.address, tokenDAI.address, {
        from: aliceAddress,
      })
    })
  })

  describe('Checks quotes from the Delegate', async () => {
    before(
      'Adds a rule to send up to 100K DAI for WETH at 0.0032 WETH/DAI',
      async () => {
        emitted(
          await aliceDelegate.setRule(
            tokenDAI.address,
            tokenWETH.address,
            100000,
            32,
            4,
            { from: aliceAddress }
          ),
          'SetRule'
        )
      }
    )

    it('Gets a quote to buy 20K DAI for WETH (Quote: 64 WETH)', async () => {
      const quote = await aliceDelegate.getSignerSideQuote.call(
        20000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 64)
    })

    it('Gets a quote to sell 100K (Max) DAI for WETH (Quote: 320 WETH)', async () => {
      const quote = await aliceDelegate.getSignerSideQuote.call(
        100000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 320)
    })

    it('Gets a quote to sell 1 WETH for DAI (Quote: 300 DAI)', async () => {
      const quote = await aliceDelegate.getSenderSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote, 312)
    })

    it('Gets a quote to sell 500 DAI for WETH (False: No rule)', async () => {
      const quote = await aliceDelegate.getSenderSideQuote.call(
        500,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 0)
    })

    it('Gets a max quote to buy WETH for DAI', async () => {
      const quote = await aliceDelegate.getMaxQuote.call(
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote[0], 100000)
      equal(quote[1], 320)
    })

    it('Gets a max quote for a non-existent rule', async () => {
      const quote = await aliceDelegate.getMaxQuote.call(
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote[0], 0)
      equal(quote[1], 0)
    })

    it('Gets a quote to buy WETH for 250000 DAI (False: Exceeds Max)', async () => {
      const quote = await aliceDelegate.getSignerSideQuote.call(
        250000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 0)
    })

    it('Gets a quote to buy 500 WETH for DAI (False: Exceeds Max)', async () => {
      const quote = await aliceDelegate.getSenderSideQuote.call(
        500,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote, 0)
    })
  })

  describe('Test tradeWallet logic', async () => {
    let quote
    before('sets up rule and quote', async () => {
      // Delegate will trade up to 100,000 DAI for WETH, at 200 DAI/WETH
      await aliceDelegate.setRule(
        tokenDAI.address, // Delegate's token
        tokenWETH.address, // Signer's token
        100000,
        5,
        3,
        { from: aliceAddress }
      )
      // Signer wants to trade 1 WETH for x DAI
      quote = await aliceDelegate.getSenderSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
    })

    it('should not trade for a different wallet', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          wallet: carolAddress,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'INVALID_SENDER_WALLET'
      )
    })

    it('should not accept open trades', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          // no wallet provided means wallet = address(0)
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'INVALID_SENDER_WALLET'
      )
    })

    it("should not trade if the tradeWallet hasn't authorized the delegate to send", async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          wallet: aliceTradeWallet, //correct trade wallet provided
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      // aliceTradeWallet hasn't authorized Delegate to swap
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })

    it("should not trade if the tradeWallet's authorization has expired", async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          wallet: aliceTradeWallet, //correct trade wallet provided
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // authorize the delegate to be sender
      let expiry = await getTimestampPlusDays(0.5)
      let tx = await swapContract.authorizeSender(
        aliceDelegate.address,
        expiry,
        {
          from: aliceTradeWallet,
        }
      )
      emitted(tx, 'AuthorizeSender')

      // increase time past expiry
      await advanceTime(SECONDS_IN_DAY * 0.6)

      // Succeeds on the Delegate, fails on the Swap.
      // aliceTradeWallet approval has expired
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })

    it('should trade if the tradeWallet has authorized the delegate to send', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          wallet: aliceTradeWallet, //correct trade wallet provided
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // tradeWallet needs DAI to trade
      emitted(await tokenDAI.mint(aliceTradeWallet, 300), 'Transfer')
      ok(
        await balances(aliceTradeWallet, [[tokenDAI, 300], [tokenWETH, 0]]),
        'Trade Wallet balances are incorrect'
      )

      // bob needs WETH to trade
      emitted(await tokenWETH.mint(bobAddress, 2), 'Transfer')
      ok(
        await balances(bobAddress, [[tokenDAI, 0], [tokenWETH, 2]]),
        'Bob balances are incorrect'
      )

      // aliceTradeWallet must authorize the Delegate contract to swap
      let expiry = await getTimestampPlusDays(0.5)
      let tx = await swapContract.authorizeSender(
        aliceDelegate.address,
        expiry,
        {
          from: aliceTradeWallet,
        }
      )
      emitted(tx, 'AuthorizeSender')

      // both approve Swap to transfer tokens
      emitted(
        await tokenDAI.approve(swapAddress, 200, { from: aliceTradeWallet }),
        'Approval'
      )
      emitted(
        await tokenWETH.approve(swapAddress, 1, { from: bobAddress }),
        'Approval'
      )

      // Now the swap succeeds
      await aliceDelegate.provideOrder(order, { from: bobAddress })

      // remove authorization
      await swapContract.revokeSender(aliceDelegate.address, {
        from: aliceTradeWallet,
      })
    })
  })

  describe('Provide some orders to the Delegate', async () => {
    let quote
    before('Gets a quote for 1 WETH', async () => {
      quote = await aliceDelegate.getSenderSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
    })

    it('Use quote with non-extent rule', async () => {
      // Note: Consumer is the order signer, Delegate is the order sender.
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 1,
        },
        sender: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: 1,
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('Use quote with incorrect signer wallet', async () => {
      // Note: Consumer is the order signer, Delegate is the order sender.
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(order, { from: carolAddress }),
        'SIGNER_MUST_BE_SENDER'
      )
    })

    it('Use quote larger than delegate rule', async () => {
      // Delegate trades WETH for 100 DAI. Max trade is 2 WETH.
      await aliceDelegate.setRule(
        tokenWETH.address, // Delegate's token
        tokenDAI.address, // Signer's token
        2,
        100,
        0,
        { from: aliceAddress }
      )
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 300,
        },
        sender: {
          wallet: aliceTradeWallet,
          token: tokenWETH.address,
          param: quote.toNumber(),
        },
      })

      // 300 DAI is 3 WETH, which is more than the max
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'AMOUNT_EXCEEDS_MAX'
      )
    })

    it('Use incorrect price on delegate', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: 500, //this is more than the delegate rule would pay out
        },
      })

      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'PRICE_INCORRECT'
      )
    })

    it('Use quote with incorrect signer token kind', async () => {
      // Note: Consumer is the order signer, Delegate is the order sender.
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
          kind: '0x80ac58cd',
        },
        sender: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'SIGNER_KIND_MUST_BE_ERC20'
      )
    })

    it('Use quote with incorrect sender token kind', async () => {
      // Note: Consumer is the order signer, Delegate is the order sender.
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: quote.toNumber(),
          kind: '0x80ac58cd',
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'SENDER_KIND_MUST_BE_ERC20'
      )
    })

    it('Gets a quote to sell 1 WETH and takes it', async () => {
      // Note: Consumer is the order signer, Delegate is the order sender.
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        sender: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })
  })
})
