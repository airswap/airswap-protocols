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
      it('Adds a rule to send up to 1000 WETH for DAI at 300 DAI/WETH', async () => {
        emitted(
          await aliceDelegate.setRule(
            tokenWETH.address,
            tokenDAI.address,
            1000,
            3,
            2
          ),
          'SetRule'
        )
      })
    })

    describe('Get quotes from the Delegate', () => {
      it('Gets a quote to buy 1 WETH for DAI (Quote: 300 DAI)', async () => {
        const quote = await aliceDelegate.getBuyQuote(
          1,
          tokenWETH.address,
          tokenDAI.address
        )
        equal(quote, 300)
      })

      it('Gets a quote to buy 1000 WETH (Max) for DAI (Quote: 25 DAI)', async () => {
        const quote = await aliceDelegate.getBuyQuote(
          1000,
          tokenWETH.address,
          tokenDAI.address
        )
        equal(quote, 300000)
      })

      it('Gets a quote to sell 1000 DAI for WETH (Quote: 1 WETH)', async () => {
        const quote = await aliceDelegate.getSellQuote(
          3000,
          tokenDAI.address,
          tokenWETH.address
        )
        equal(quote, 10)
      })

      it('Gets a quote to sell 5 WETH for DAI (Fail: No rule)', async () => {
        await reverted(
          aliceDelegate.getSellQuote(5, tokenWETH.address, tokenDAI.address),
          'TOKEN_PAIR_INACTIVE'
        )
      })

      it('Gets a max quote to buy WETH for DAI', async () => {
        const quote = await aliceDelegate.getMaxQuote(
          tokenWETH.address,
          tokenDAI.address
        )
        equal(quote[0], 1000)
        equal(quote[2], 300000)
      })

      it('Gets a quote to buy 1500 WETH for DAI (Exceeds Max)', async () => {
        await reverted(
          aliceDelegate.getBuyQuote(1500, tokenWETH.address, tokenDAI.address),
          'AMOUNT_EXCEEDS_MAX'
        )
      })
    })

    describe('Provide some orders to the Delegate', () => {
      it('Gets a quote to buy 1 WETH and takes it', async () => {
        const quote = await aliceDelegate.getBuyQuote(
          1,
          tokenWETH.address,
          tokenDAI.address
        )

        // Note: Consumer is the order maker, Delegate is the order taker.
        const { order, signature } = await orders.getOrder({
          maker: {
            wallet: bobAddress,
            token: tokenDAI.address,
            param: quote,
          },
          taker: {
            wallet: aliceAddress,
            token: tokenWETH.address,
            param: 1,
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
