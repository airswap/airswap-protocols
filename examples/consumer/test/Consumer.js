const Swap = artifacts.require('Swap')
const Consumer = artifacts.require('Consumer')
const Indexer = artifacts.require('Indexer')
const Peer = artifacts.require('Peer')
const FungibleToken = artifacts.require('FungibleToken')
const Types = artifacts.require('Types')

const { emitted, equal, ok } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const {
  getTimestampPlusDays,
  revertToSnapShot,
  takeSnapshot,
} = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

let indexer
let consumer
let swapContract

let indexerAddress
let consumerAddress
let swapAddress
let alicePeer

let tokenAST
let tokenDAI
let tokenWETH

let snapshotId

// TODO: Use token-unit for realistic token amounts.

contract('Consumer', async accounts => {
  let ownerAddress = accounts[0]
  let aliceAddress = accounts[1]
  let bobAddress = accounts[2]
  let carolAddress = accounts[3]

  before('Setup', async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  after(async () => {
    await revertToSnapShot(snapshotId)
  })

  describe('Setup', async () => {
    before('Deploys all the things', async () => {
      tokenAST = await FungibleToken.new()
      tokenDAI = await FungibleToken.new()
      tokenWETH = await FungibleToken.new()
      // link types to swap
      await Swap.link(Types, (await Types.new()).address)
      // now deploy swap
      swapContract = await Swap.new()
      swapAddress = swapContract.address

      indexer = await Indexer.new(tokenAST.address, EMPTY_ADDRESS, {
        from: ownerAddress,
      })

      indexerAddress = indexer.address
      consumer = await Consumer.new(swapAddress, indexerAddress, {
        from: ownerAddress,
      })
      consumerAddress = consumer.address
      alicePeer = await Peer.new(swapAddress, aliceAddress, {
        from: aliceAddress,
      })
    })

    it('Alice authorizes the new peer', async () => {
      emitted(
        await swapContract.authorize(
          alicePeer.address,
          await getTimestampPlusDays(1),
          { from: aliceAddress }
        ),
        'Authorize'
      )
    })

    it('Bob creates a market (collection of intents) for WETH/DAI', async () => {
      emitted(
        await indexer.createMarket(tokenWETH.address, tokenDAI.address, {
          from: bobAddress,
        }),
        'CreateMarket'
      )
    })

    it('Staking tokens are minted for Alice', async () => {
      emitted(await tokenAST.mint(aliceAddress, 1000), 'Transfer')
    })

    it('Alice approves Indexer to spend staking tokens', async () => {
      emitted(
        await tokenAST.approve(indexerAddress, 10000, { from: aliceAddress }),
        'Approval'
      )
    })

    it('Checks balances', async () => {
      ok(await balances(aliceAddress, [[tokenAST, 1000]]))
      ok(await balances(indexerAddress, [[tokenAST, 0]]))
    })

    it('Alice attempts to stake and set an intent succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          alicePeer.address,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })
  })

  describe('Alice adds some peer rules', async () => {
    it('Adds a rule to send up to 150 WETH for DAI at 309.52 DAI/WETH', async () => {
      emitted(
        await alicePeer.setRule(
          tokenWETH.address,
          tokenDAI.address,
          150,
          30952,
          2,
          { from: aliceAddress }
        ),
        'SetRule'
      )
    })

    it('Checks the Peer maximum', async () => {
      const quote = await alicePeer.getMaxQuote.call(
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote[0], 150)
      equal(quote[1], 46428)
    })
  })

  describe('Consumer', async () => {
    it('Finds best price to buy 1 WETH for DAI', async () => {
      const quote = await consumer.findBestBuy.call(
        100,
        tokenWETH.address,
        tokenDAI.address,
        50
      )
      equal(quote[0], padAddressToLocator(alicePeer.address))
      equal(quote[1], 30952)
    })

    it('Takes best price (Alice peer)', async () => {
      // Alice peer gets some WETH to trade throug her Peer
      tokenWETH.mint(aliceAddress, 100)

      // Alice approves Swap contract to transfer her WETH
      emitted(
        await tokenWETH.approve(swapAddress, 10000, { from: aliceAddress }),
        'Approval'
      )

      // Carol gets some DAI to use to buy some WETH
      tokenDAI.mint(carolAddress, 50000)

      // Carol approves the Consumer to transfer her DAI
      emitted(
        await tokenDAI.approve(consumerAddress, 50000, {
          from: carolAddress,
        }),
        'Approval'
      )

      // Carol takes the best price for 100 DAI
      await consumer.takeBestBuy(100, tokenWETH.address, tokenDAI.address, 50, {
        from: carolAddress,
      })

      // Assert that Carol has taken 100 WETH from Alice
      equal(await tokenWETH.balanceOf(aliceAddress), 0)
      equal(await tokenWETH.balanceOf(carolAddress), 100)
    })

    it('Checks the new Peer maximum', async () => {
      const result = await alicePeer.getMaxQuote.call(
        tokenWETH.address,
        tokenDAI.address
      )
      equal(result[0], 50)
      equal(result[1], 15476)
    })
  })
})
