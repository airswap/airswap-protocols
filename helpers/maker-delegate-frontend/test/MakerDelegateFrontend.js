const Swap = artifacts.require('Swap')
const MakerDelegateFrontend = artifacts.require('MakerDelegateFrontend')
const Indexer = artifacts.require('Indexer')
const MakerDelegate = artifacts.require('MakerDelegate')
const FungibleToken = artifacts.require('FungibleToken')
const Types = artifacts.require('Types')
var BigNumber = require('bn.js')
const { emitted, equal, ok, reverted } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const {
  advanceTimeAndBlock,
  getTimestampPlusDays,
  revertToSnapShot,
  takeSnapshot,
} = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

let indexer
let makerDelegateFrontend
let swapContract

let indexerAddress
let makerDelegateFrontendAddress
let swapAddress
let aliceMakerDelegate

let tokenAST
let tokenDAI
let tokenWETH

let snapshotId

contract('MakerDelegateFrontend', async accounts => {
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

  describe('Setup maker-delegate for Alice', async () => {
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
      makerDelegateFrontend = await MakerDelegateFrontend.new(
        indexerAddress,
        swapAddress,
        {
          from: ownerAddress,
        }
      )
      makerDelegateFrontendAddress = makerDelegateFrontend.address
      aliceMakerDelegate = await MakerDelegate.new(swapAddress, aliceAddress, {
        from: aliceAddress,
      })
    })

    it('Alice authorizes the new maker-delegate', async () => {
      emitted(
        await swapContract.authorize(
          aliceMakerDelegate.address,
          await getTimestampPlusDays(1),
          { from: aliceAddress }
        ),
        'Authorize'
      )
    })

    it('Bob creates an index for DAI (maker)/WETH (taker)', async () => {
      emitted(
        await indexer.createIndex(tokenDAI.address, tokenWETH.address, {
          from: bobAddress,
        }),
        'CreateIndex'
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
          tokenDAI.address,
          tokenWETH.address,
          500,
          aliceMakerDelegate.address,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })
  })

  describe('MakerDelegateFrontend - fills for non-existent quotes', async () => {
    it('Finds best price to buy 100 AST for DAI - reverts ', async () => {
      await reverted(
        makerDelegateFrontend.fillBestMakerSideOrder.call(
          100,
          tokenAST.address,
          tokenDAI.address,
          5
        ),
        'NO_LOCATOR, BAILING'
      )
    })

    it('Finds best price to sell 100 AST for DAI - reverts', async () => {
      await reverted(
        makerDelegateFrontend.fillBestTakerSideOrder.call(
          100,
          tokenAST.address,
          tokenDAI.address,
          5
        ),
        'NO_LOCATOR, BAILING'
      )
    })
  })

  describe('Alice adds some maker-delegate rules', async () => {
    it('Adds a rule to send up to 150 WETH for DAI at 309.52 DAI/WETH', async () => {
      emitted(
        await aliceMakerDelegate.setRule(
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

    it('Checks the MakerDelegate maximum', async () => {
      const quote = await aliceMakerDelegate.getMaxQuote.call(
        tokenWETH.address,
        tokenDAI.address
      )
      equal(quote[0], 150)
      equal(quote[1], 46428)
    })
  })

  describe('MakerDelegateFrontend - TakerSide', async () => {
    it('Get the intent', async () => {
      const result = await indexer.getIntents.call(
        tokenDAI.address,
        tokenWETH.address,
        5
      )
      equal(result[0], padAddressToLocator(aliceMakerDelegate.address))
    })

    it('Finds best price to buy 1 WETH for DAI', async () => {
      const quote = await makerDelegateFrontend.getBestTakerSideQuote.call(
        100,
        tokenWETH.address,
        tokenDAI.address,
        5
      )
      equal(quote[0], padAddressToLocator(aliceMakerDelegate.address))
      equal(quote[1].toNumber(), 30952)
    })

    it('Finds best price to very large WETH amount for DAI', async () => {
      const quote = await makerDelegateFrontend.getBestTakerSideQuote.call(
        10000000,
        tokenWETH.address,
        tokenDAI.address,
        5
      )
      equal(quote[0], padAddressToLocator(EMPTY_ADDRESS))
      equal(
        new BigNumber(quote[1]).toString(16),
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    })

    it('Takes best price (Alice maker-delegate) - TakerSide', async () => {
      // Alice maker-delegate gets some WETH to trade through the MakerDelegate
      await tokenWETH.mint(aliceAddress, 200)

      // Alice approves Swap contract to transfer her WETH
      emitted(
        await tokenWETH.approve(swapAddress, 10000, { from: aliceAddress }),
        'Approval'
      )

      // Carol gets some DAI to use to buy some WETH
      await tokenDAI.mint(carolAddress, 50000)

      // Carol approves the MakerDelegateFrontend to transfer her DAI
      emitted(
        await tokenDAI.approve(makerDelegateFrontendAddress, 50000, {
          from: carolAddress,
        }),
        'Approval'
      )

      // Carol takes the best price for 100 DAI
      await makerDelegateFrontend.fillBestTakerSideOrder(
        100,
        tokenWETH.address,
        tokenDAI.address,
        50,
        {
          from: carolAddress,
        }
      )

      // Assert that Carol has taken 100 WETH from Alice
      ok(await balances(aliceAddress, [[tokenWETH, 100], [tokenDAI, 30952]]))
      ok(await balances(carolAddress, [[tokenWETH, 100], [tokenDAI, 19048]]))
    })

    it('Checks the new MakerDelegate maximum', async () => {
      const result = await aliceMakerDelegate.getMaxQuote.call(
        tokenWETH.address,
        tokenDAI.address
      )
      equal(result[0], 50)
      equal(result[1], 15476)
    })
  })

  describe('MakerDelegateFrontend - MakerSide', async () => {
    it('Finds best price to buy 309 DAI for WETH', async () => {
      const quote = await makerDelegateFrontend.getBestMakerSideQuote.call(
        15476,
        tokenDAI.address,
        tokenWETH.address,
        5
      )

      equal(quote[0], padAddressToLocator(aliceMakerDelegate.address))
      equal(quote[1].toNumber(), 50)
    })

    it('Takes best price (Alice maker-delegate) - MakerSide', async () => {
      await advanceTimeAndBlock(10)
      // Carol takes the best price for 100 DAI
      await makerDelegateFrontend.fillBestMakerSideOrder(
        15476,
        tokenDAI.address,
        tokenWETH.address,
        50,
        {
          from: carolAddress,
        }
      )

      // Assert that Carol has taken 50 WETH from Alice
      ok(await balances(aliceAddress, [[tokenWETH, 50]]))
      ok(await balances(carolAddress, [[tokenWETH, 150]]))
    })

    it('Checks the new MakerDelegate maximum', async () => {
      const result = await aliceMakerDelegate.getMaxQuote.call(
        tokenWETH.address,
        tokenDAI.address
      )
      equal(result[0], 0)
      equal(result[1], 0)
    })
  })
})
