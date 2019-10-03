const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal, ok } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const {
  takeSnapshot,
  revertToSnapShot,
  getTimestampPlusDays,
  advanceTime,
} = require('@airswap/test-utils').time
const { orders } = require('@airswap/order-utils')
const {
  EMPTY_ADDRESS,
  SECONDS_IN_DAY,
} = require('@airswap/order-utils').constants

let snapshotId

contract('Delegate', async accounts => {
  let aliceAddress = accounts[1]
  let bobAddress = accounts[2]
  let carolAddress = accounts[3]
  let aliceTradeWallet = accounts[4]

  let aliceDelegate

  let swapContract
  let swapAddress

  let tokenDAI
  let tokenWETH

  orders.setKnownAccounts([aliceAddress, bobAddress, carolAddress])

  before('Setup', async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
    // link types to swap
    await Swap.link(Types, (await Types.new()).address)
    // now deploy swap
    swapContract = await Swap.new()
    swapAddress = swapContract.address

    orders.setVerifyingContract(swapAddress)

    tokenWETH = await FungibleToken.new()
    tokenDAI = await FungibleToken.new()

    aliceDelegate = await Delegate.new(swapAddress, aliceAddress, aliceTradeWallet, {
      from: aliceAddress,
    })
  })

  after(async () => {
    await revertToSnapShot(snapshotId)
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
      await aliceDelegate.setTradeWallet(aliceTradeWallet, { from: aliceAddress })
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
        await aliceDelegate.getMakerSideQuote.call(
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
        await aliceDelegate.getMakerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        0
      )
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
        await aliceDelegate.getMakerSideQuote.call(
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
        await aliceDelegate.getMakerSideQuote.call(
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
        await aliceDelegate.getMakerSideQuote.call(
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
      const quote = await aliceDelegate.getMakerSideQuote.call(
        20000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 64)
    })

    it('Gets a quote to sell 100K (Max) DAI for WETH (Quote: 320 WETH)', async () => {
      const quote = await aliceDelegate.getMakerSideQuote.call(
        100000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 320)
    })

    it('Gets a quote to sell 1 WETH for DAI (Quote: 300 DAI)', async () => {
      const quote = await aliceDelegate.getTakerSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote, 312)
    })

    it('Gets a quote to sell 500 DAI for WETH (False: No rule)', async () => {
      const quote = await aliceDelegate.getTakerSideQuote.call(
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
      const quote = await aliceDelegate.getMakerSideQuote.call(
        250000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 0)
    })

    it('Gets a quote to buy 500 WETH for DAI (False: Exceeds Max)', async () => {
      const quote = await aliceDelegate.getTakerSideQuote.call(
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
        tokenWETH.address, // Maker's token
        100000,
        5,
        3,
        { from: aliceAddress }
      )
      // Maker wants to trade 1 WETH for x DAI
      quote = await aliceDelegate.getTakerSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
    })

    it('should not trade for a different wallet', async () => {
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: carolAddress,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'INVALID_TAKER_WALLET'
      )
    })

    it('should not accept open trades', async () => {
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          // no wallet provided means wallet = address(0)
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'INVALID_TAKER_WALLET'
      )
    })

    it("should not trade if the tradeWallet hasn't authorized the peer", async () => {
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
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
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: aliceTradeWallet, //correct trade wallet provided
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // authorize the peer
      let expiry = await getTimestampPlusDays(0.5)
      let tx = await swapContract.authorize(aliceDelegate.address, expiry, {
        from: aliceTradeWallet,
      })
      emitted(tx, 'Authorize')

      // increase time past expiry
      await advanceTime(SECONDS_IN_DAY * 0.6)

      // Succeeds on the Delegate, fails on the Swap.
      // aliceTradeWallet approval has expired
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })

    it('should trade if the tradeWallet has authorized the peer', async () => {
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
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
      let tx = await swapContract.authorize(aliceDelegate.address, expiry, {
        from: aliceTradeWallet,
      })
      emitted(tx, 'Authorize')

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
      await swapContract.revoke(aliceDelegate.address, {
        from: aliceTradeWallet,
      })
    })
  })

  describe('Provide some orders to the Delegate', async () => {
    let quote
    before('Gets a quote for 1 WETH', async () => {
      quote = await aliceDelegate.getTakerSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
    })

    it('Use quote with non-extent rule', async () => {
      // Note: Consumer is the order maker, Delegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 1,
        },
        taker: {
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

    it('Use quote with incorrect maker wallet', async () => {
      // Note: Consumer is the order maker, Delegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(order, { from: carolAddress }),
        'MAKER_MUST_BE_SENDER'
      )
    })

    it('Use quote larger than peer rule', async () => {
      // Delegate trades WETH for 100 DAI. Max trade is 2 WETH.
      await aliceDelegate.setRule(
        tokenWETH.address, // Delegate's token
        tokenDAI.address, // Maker's token
        2,
        100,
        0,
        { from: aliceAddress }
      )
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 300,
        },
        taker: {
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

    it('Use incorrect price on peer', async () => {
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: 500, //this is more than the peer rule would pay out
        },
      })

      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'PRICE_INCORRECT'
      )
    })

    it('Use quote with incorrect maker token kind', async () => {
      // Note: Consumer is the order maker, Delegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
          kind: '0x80ac58cd',
        },
        taker: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'MAKER_MUST_BE_ERC20'
      )
    })

    it('Use quote with incorrect taker token kind', async () => {
      // Note: Consumer is the order maker, Delegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: aliceTradeWallet,
          token: tokenDAI.address,
          param: quote.toNumber(),
          kind: '0x80ac58cd',
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(order, { from: bobAddress }),
        'TAKER_MUST_BE_ERC20'
      )
    })

    it('Gets a quote to sell 1 WETH and takes it', async () => {
      // Note: Consumer is the order maker, Delegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
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
