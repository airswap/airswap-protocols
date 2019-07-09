const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal } = require('@airswap/test-utils').assert
const { orders } = require('@airswap/order-utils')

contract(
  'Delegate',
  ([aliceAddress, bobAddress, carolAddress, davidAddress]) => {
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
      swapContract = await Swap.new()
      swapAddress = swapContract.address

      orders.setVerifyingContract(swapAddress)

      tokenWETH = await FungibleToken.new()
      tokenDAI = await FungibleToken.new()
    })

    describe('Deploying...', () => {
      it('Alice deployed a Swap Delegate', async () => {
        aliceDelegate = await Delegate.new(swapAddress)
        await aliceDelegate.setSwapContract(swapAddress)
      })
    })

    describe('Alice adds rules to the Delegate', () => {
      it('Adds a rule to send up to 100,000 DAI for WETH at 0.0032 WETH/DAI', async () => {
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
      })
    })

    // TODO: Add tests for unsetRule.

    describe('Get quotes from the Delegate', () => {
      it('Gets a quote to buy 20,000 DAI for WETH (Quote: 64 WETH)', async () => {
        const quote = await aliceDelegate.getBuyQuote(
          20000,
          tokenDAI.address,
          tokenWETH.address
        )
        equal(quote, 64)
      })

      it('Gets a quote to sell 100,000 (Max) DAI for WETH (Quote: 320 WETH)', async () => {
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

      it('Gets a quote to sell 5 WETH for DAI (Fail: No rule)', async () => {
        await reverted(
          aliceDelegate.getSellQuote(5, tokenDAI.address, tokenWETH.address),
          'TOKEN_PAIR_INACTIVE'
        )
      })

      it('Gets a max quote to buy WETH for DAI', async () => {
        const quote = await aliceDelegate.getMaxQuote(
          tokenDAI.address,
          tokenWETH.address
        )
        equal(quote[0], 100000)
        equal(quote[2], 320)
      })

      it('Gets a quote to buy 1500 WETH for DAI (Exceeds Max)', async () => {
        await reverted(
          aliceDelegate.getBuyQuote(
            250000,
            tokenDAI.address,
            tokenWETH.address
          ),
          'AMOUNT_EXCEEDS_MAX'
        )
      })
    })

    describe('Provide some orders to the Delegate', () => {
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
  }
)
