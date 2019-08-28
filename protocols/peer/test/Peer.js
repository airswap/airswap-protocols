const Peer = artifacts.require('Peer')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { orders } = require('@airswap/order-utils')

let snapshotId

contract('Peer', async accounts => {
  let aliceAddress = accounts[0]
  let bobAddress = accounts[1]
  let carolAddress = accounts[2]
  let davidAddress = accounts[3]

  let alicePeer

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
    it('Alice deployed a Swap Peer', async () => {
      alicePeer = await Peer.new(swapAddress, aliceAddress, {
        from: aliceAddress,
      })
    })
  })

  describe('Checks set and unset rule', async () => {
    it('Set and unset a rule for WETH/DAI', async () => {
      await alicePeer.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300,
        0
      )
      equal(
        await alicePeer.getMakerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        300
      )
      await alicePeer.unsetRule(tokenWETH.address, tokenDAI.address)
      equal(
        await alicePeer.getMakerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        0
      )
    })
  })

  describe('Checks pricing logic from the Peer', async () => {
    it('Send up to 100K WETH for DAI at 300 DAI/WETH', async () => {
      await alicePeer.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300,
        0
      )
      equal(
        await alicePeer.getMakerSideQuote.call(
          1,
          tokenWETH.address,
          tokenDAI.address
        ),
        300
      )
    })
    it('Send up to 100K DAI for WETH at 0.0032 WETH/DAI', async () => {
      await alicePeer.setRule(
        tokenDAI.address,
        tokenWETH.address,
        100000,
        32,
        4
      )
      equal(
        await alicePeer.getMakerSideQuote.call(
          100000,
          tokenDAI.address,
          tokenWETH.address
        ),
        320
      )
    })
    it('Send up to 100K WETH for DAI at 300.005 DAI/WETH', async () => {
      await alicePeer.setRule(
        tokenWETH.address,
        tokenDAI.address,
        100000,
        300005,
        3
      )
      equal(
        await alicePeer.getMakerSideQuote.call(
          20000,
          tokenWETH.address,
          tokenDAI.address
        ),
        6000100
      )
    })
  })

  describe('Checks quotes from the Peer', async () => {
    before(
      'Adds a rule to send up to 100K DAI for WETH at 0.0032 WETH/DAI',
      async () => {
        emitted(
          await alicePeer.setRule(
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
      const quote = await alicePeer.getMakerSideQuote.call(
        20000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 64)
    })

    it('Gets a quote to sell 100K (Max) DAI for WETH (Quote: 320 WETH)', async () => {
      const quote = await alicePeer.getMakerSideQuote.call(
        100000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 320)
    })

    it('Gets a quote to sell 1 WETH for DAI (Quote: 300 DAI)', async () => {
      const quote = await alicePeer.getTakerSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote, 312)
    })

    it('Gets a quote to sell 5 WETH for DAI (False: No rule)', async () => {
      const quote = await alicePeer.getTakerSideQuote.call(
        5,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, false)
    })

    it('Gets a max quote to buy WETH for DAI', async () => {
      const quote = await alicePeer.getMaxQuote.call(
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote[0], 100000)
      equal(quote[1], 320)
    })

    it('Gets a quote to buy 1500 WETH for DAI (False: Exceeds Max)', async () => {
      const quote = await alicePeer.getMakerSideQuote.call(
        250000,
        tokenDAI.address,
        tokenWETH.address
      )
      equal(quote, 0)
    })
  })

  describe('Provide some orders to the Peer', async () => {
    let quote
    before('Gets a quote for 1 WETH', async () => {
      quote = await alicePeer.getTakerSideQuote.call(
        1,
        tokenWETH.address,
        tokenDAI.address
      )
    })

    it('Use quote with non-extent rule', async () => {
      // Note: Consumer is the order maker, Peer is the order taker.
      const { order, signature } = await orders.getOrder({
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

      // Succeeds on the Peer, fails on the Swap.
      await reverted(
        alicePeer.provideOrder(order, signature, { from: bobAddress }),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('Use quote with incorrect maker wallet', async () => {
      // Note: Consumer is the order maker, Peer is the order taker.
      const { order, signature } = await orders.getOrder({
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

      // Succeeds on the Peer, fails on the Swap.
      await reverted(
        alicePeer.provideOrder(order, signature, { from: carolAddress }),
        'MAKER_MUST_BE_SENDER'
      )
    })

    it('Use quote with incorrect maker token kind', async () => {
      // Note: Consumer is the order maker, Peer is the order taker.
      const { order, signature } = await orders.getOrder({
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

      // Succeeds on the Peer, fails on the Swap.
      await reverted(
        alicePeer.provideOrder(order, signature, { from: bobAddress }),
        'MAKER_MUST_BE_ERC20'
      )
    })

    it('Use quote with incorrect taker token kind', async () => {
      // Note: Consumer is the order maker, Peer is the order taker.
      const { order, signature } = await orders.getOrder({
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

      // Succeeds on the Peer, fails on the Swap.
      await reverted(
        alicePeer.provideOrder(order, signature, { from: bobAddress }),
        'TAKER_MUST_BE_ERC20'
      )
    })

    it('Gets a quote to sell 1 WETH and takes it', async () => {
      // Note: Consumer is the order maker, Peer is the order taker.
      const { order, signature } = await orders.getOrder({
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

      // Succeeds on the Peer, fails on the Swap.
      await reverted(
        alicePeer.provideOrder(order, signature, { from: bobAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })
  })
})
