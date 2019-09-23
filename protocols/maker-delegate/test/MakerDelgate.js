const MakerDelegate = artifacts.require('MakerDelegate')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { orders } = require('@airswap/order-utils')

let snapshotId

contract('MakerDelegate', async accounts => {
  let aliceAddress = accounts[0]
  let bobAddress = accounts[1]
  let carolAddress = accounts[2]
  let davidAddress = accounts[3]

  let aliceMakerDelegate

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
    // link types to swap
    await Swap.link(Types, (await Types.new()).address)
    // now deploy swap
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
    it('Alice deployed a Swap MakerDelegate', async () => {
      aliceMakerDelegate = await MakerDelegate.new(swapAddress, aliceAddress, {
        from: aliceAddress,
      })
    })
  })

  describe('Checks set and unset rule', async () => {
    it('Set and unset a rule for WETH/DAI', async () => {
      await aliceMakerDelegate.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300,
        0
      )
      equal(
        await aliceMakerDelegate.getMakerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        300
      )
      await aliceMakerDelegate.unsetRule(tokenWETH.address, tokenDAI.address)
      equal(
        await aliceMakerDelegate.getMakerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        0
      )
    })
  })

  describe('Checks pricing logic from the MakerDelegate', async () => {
    it('Send up to 100K WETH for DAI at 300 DAI/WETH', async () => {
      await aliceMakerDelegate.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300,
        0
      )
      equal(
        await aliceMakerDelegate.getMakerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        300
      )
    })
    it('Send up to 100K DAI for WETH at 0.0032 WETH/DAI', async () => {
      await aliceMakerDelegate.setRule(
        tokenDAI.address,
        tokenWETH.address,
        100000,
        32,
        4
      )
      equal(
        await aliceMakerDelegate.getMakerSideQuote.call(
          100000,
          tokenDAI.address,
          tokenWETH.address
        ),
        320
      )
    })
    it('Send up to 100K WETH for DAI at 300.005 DAI/WETH', async () => {
      await aliceMakerDelegate.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300005,
        3
      )
      equal(
        await aliceMakerDelegate.getMakerSideQuote.call(
          20000,
          tokenWETH.address,
          tokenDAI.address
        ),
        6000100
      )
    })
  })

  describe('Checks quotes from the MakerDelegate', async () => {
    before(
      'Adds a rule to send up to 100K DAI for WETH at 0.0032 WETH/DAI',
      async () => {
        emitted(
          await aliceMakerDelegate.setRule(
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
      const quote = await aliceMakerDelegate.getMakerSideQuote.call(
        20000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 64)
    })

    it('Gets a quote to sell 100K (Max) DAI for WETH (Quote: 320 WETH)', async () => {
      const quote = await aliceMakerDelegate.getMakerSideQuote.call(
        100000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 320)
    })

    it('Gets a quote to sell 1 WETH for DAI (Quote: 300 DAI)', async () => {
      const quote = await aliceMakerDelegate.getTakerSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote, 312)
    })

    it('Gets a quote to sell 5 WETH for DAI (False: No rule)', async () => {
      const quote = await aliceMakerDelegate.getTakerSideQuote.call(
        5,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, false)
    })

    it('Gets a max quote to buy WETH for DAI', async () => {
      const quote = await aliceMakerDelegate.getMaxQuote.call(
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote[0], 100000)
      equal(quote[1], 320)
    })

    it('Gets a quote to buy 1500 WETH for DAI (False: Exceeds Max)', async () => {
      const quote = await aliceMakerDelegate.getMakerSideQuote.call(
        250000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 0)
    })
  })

  describe('Provide some orders to the MakerDelegate', async () => {
    let quote
    before('Gets a quote for 1 WETH', async () => {
      quote = await aliceMakerDelegate.getTakerSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
    })

    it('Use quote with non-extent rule', async () => {
      // Note: Consumer is the order maker, MakerDelegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 1,
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 1,
        },
      })

      // Succeeds on the MakerDelegate, fails on the Swap.
      await reverted(
        aliceMakerDelegate.provideOrder(order, { from: bobAddress }),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('Use quote with incorrect maker wallet', async () => {
      // Note: Consumer is the order maker, MakerDelegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the MakerDelegate, fails on the Swap.
      await reverted(
        aliceMakerDelegate.provideOrder(order, { from: carolAddress }),
        'MAKER_MUST_BE_SENDER'
      )
    })

    it('Use quote with incorrect maker token kind', async () => {
      // Note: Consumer is the order maker, MakerDelegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
          kind: '0x80ac58cd',
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the MakerDelegate, fails on the Swap.
      await reverted(
        aliceMakerDelegate.provideOrder(order, { from: bobAddress }),
        'MAKER_MUST_BE_ERC20'
      )
    })

    it('Use quote with incorrect taker token kind', async () => {
      // Note: Consumer is the order maker, MakerDelegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: quote.toNumber(),
          kind: '0x80ac58cd',
        },
      })

      // Succeeds on the MakerDelegate, fails on the Swap.
      await reverted(
        aliceMakerDelegate.provideOrder(order, { from: bobAddress }),
        'TAKER_MUST_BE_ERC20'
      )
    })

    it('Gets a quote to sell 1 WETH and takes it', async () => {
      // Note: Consumer is the order maker, MakerDelegate is the order taker.
      const order = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 1,
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: quote.toNumber(),
        },
      })

      // Succeeds on the MakerDelegate, fails on the Swap.
      await reverted(
        aliceMakerDelegate.provideOrder(order, { from: bobAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })
  })
})
