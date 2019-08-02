/* global artifacts, contract */
const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const Transfers = artifacts.require('Transfers')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { orders } = require('@airswap/order-utils')

let snapshotId

contract('Delegate', async accounts => {
  let aliceAddress = accounts[0]
  let bobAddress = accounts[1]
  let carolAddress = accounts[2]
  let davidAddress = accounts[3]

  let aliceDelegate

  let swapContract
  let swapAddress

  let tokenDAI
  let tokenWETH

  orders.setKnownAccounts([
    aliceAddress,
    bobAddress,
    carolAddress,
    davidAddress,
  ])

  before('Setup', async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']

    // deploy both libs
    const transfersLib = await Transfers.new()
    const typesLib = await Types.new()

    // link both libs to swap
    await Swap.link(Transfers, transfersLib.address)
    await Swap.link(Types, typesLib.address)
    swapContract = await Swap.new()
    swapAddress = swapContract.address

    orders.setVerifyingContract(swapAddress)

    tokenWETH = await FungibleToken.new()
    tokenDAI = await FungibleToken.new()
  })

  after(async () => {
    await revertToSnapShot(snapshotId)
  })

  describe('Deploying...', async () => {
    it('Alice deployed a Swap Delegate', async () => {
      aliceDelegate = await Delegate.new(swapAddress)
      await aliceDelegate.setSwapContract(swapAddress)
    })
  })

  describe('Checks set and unset rule', async () => {
    it('Set and unset a rule for WETH/DAI', async () => {
      await aliceDelegate.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300,
        0
      )
      equal(
        await aliceDelegate.getBuyQuote(1, tokenWETH.address, tokenDAI.address),
        300
      )
      await aliceDelegate.unsetRule(tokenWETH.address, tokenDAI.address)
      equal(
        await aliceDelegate.getBuyQuote(1, tokenWETH.address, tokenDAI.address),
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
        0
      )
      equal(
        await aliceDelegate.getBuyQuote(1, tokenWETH.address, tokenDAI.address),
        300
      )
    })
    it('Send up to 100K DAI for WETH at 0.0032 WETH/DAI', async () => {
      await aliceDelegate.setRule(
        tokenDAI.address,
        tokenWETH.address,
        100000,
        32,
        4
      )
      equal(
        await aliceDelegate.getBuyQuote(
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
        3
      )
      equal(
        await aliceDelegate.getBuyQuote(
          20000,
          tokenWETH.address,
          tokenDAI.address
        ),
        6000100
      )
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
            4
          ),
          'SetRule'
        )
      }
    )

    it('Gets a quote to buy 20K DAI for WETH (Quote: 64 WETH)', async () => {
      const quote = await aliceDelegate.getBuyQuote(
        20000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 64)
    })

    it('Gets a quote to sell 100K (Max) DAI for WETH (Quote: 320 WETH)', async () => {
      const quote = await aliceDelegate.getBuyQuote(
        100000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 320)
    })

    it('Gets a quote to sell 1 WETH for DAI (Quote: 300 DAI)', async () => {
      const quote = await aliceDelegate.getSellQuote(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote, 312)
    })

    it('Gets a quote to sell 5 WETH for DAI (False: No rule)', async () => {
      const quote = await aliceDelegate.getSellQuote(
        5,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, false)
    })

    it('Gets a max quote to buy WETH for DAI', async () => {
      const quote = await aliceDelegate.getMaxQuote(
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote[0], 100000)
      equal(quote[1], 320)
    })

    it('Gets a quote to buy 1500 WETH for DAI (False: Exceeds Max)', async () => {
      const quote = await aliceDelegate.getBuyQuote(
        250000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 0)
    })
  })

  describe('Provide some orders to the Delegate', async () => {
    let quote
    before('Gets a quote for 1 WETH', async () => {
      quote = await aliceDelegate.getSellQuote(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
    })

    it('Gets a quote to sell 1 WETH and takes it', async () => {
      // Note: Consumer is the order maker, Delegate is the order taker.
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: quote,
        },
      })

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        aliceDelegate.provideOrder(
          order.nonce,
          order.expiry,
          order.maker.wallet,
          order.maker.param,
          order.maker.token,
          order.taker.wallet,
          order.taker.param,
          order.taker.token,
          signature.v,
          signature.r,
          signature.s,
          { from: bobAddress }
        ),
        'SENDER_UNAUTHORIZED'
      )
    })
  })
})
