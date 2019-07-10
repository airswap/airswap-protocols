const Swap = artifacts.require('Swap')
const Consumer = artifacts.require('Consumer')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, equal, ok } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { intents } = require('@airswap/indexer-utils')

let indexer
let consumer

let indexerAddress
let swapAddress
let aliceDelegate

function getExpiry() {
  return Math.round((new Date().getTime() + 60000) / 1000)
}

// TODO: Use token-unit for realistic token amounts.

contract(
  'Consumer',
  ([ownerAddress, aliceAddress, bobAddress, carolAddress]) => {
    describe('Deployment', async () => {
      it('Deployed staking token "AST"', async () => {
        tokenAST = await FungibleToken.deployed()
      })

      it('Deployed trading token "DAI"', async () => {
        tokenDAI = await FungibleToken.new()
      })

      it('Deployed trading token "WETH"', async () => {
        tokenWETH = await FungibleToken.new()
      })

      it('Deploys all the things', async () => {
        swapContract = await Swap.deployed()
        swapAddress = swapContract.address
        indexer = await Indexer.deployed({ from: ownerAddress })
        indexerAddress = indexer.address
        consumer = await Consumer.deployed({ from: ownerAddress })
        consumerAddress = consumer.address
      })

      it('Alice deployed a Swap Delegate', async () => {
        aliceDelegate = await Delegate.new(swapAddress, { from: aliceAddress })

        provideOrder =
          aliceDelegate.methods[
            'provideOrder((uint256,uint256,(address,address,uint256),(address,address,uint256),(address,address,uint256)),(address,bytes32,bytes32,uint8,bytes1))'
          ]
        provideOrderSimple =
          aliceDelegate.methods[
            'provideOrder(uint256,address,uint256,address,address,uint256,address,uint256,bytes32,bytes32,uint8)'
          ]
      })

      it('Alice authorizes the new delegate', async () => {
        emitted(
          await swapContract.authorize(aliceDelegate.address, getExpiry(), {
            from: aliceAddress,
          }),
          'Authorize'
        )
      })
    })

    describe('Setup', async () => {
      let location

      before('Locationalize', () => {
        location = intents.serialize(
          intents.Locators.CONTRACT,
          aliceDelegate.address
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
        ok(balances(aliceAddress, [[tokenAST, 1000]]))
        ok(balances(indexerAddress, [[tokenAST, 0]]))
      })

      it('Alice attempts to stake and set an intent succeeds', async () => {
        emitted(
          await indexer.setIntent(
            tokenWETH.address,
            tokenDAI.address,
            500,
            getExpiry(),
            location,
            {
              from: aliceAddress,
            }
          ),
          'Stake'
        )
      })
    })

    describe('Alice adds some delegate rules', () => {
      it('Adds a rule to send up to 100 WETH for DAI at 309.52 DAI/WETH', async () => {
        emitted(
          await aliceDelegate.setRule(
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

      it('Checks the Delegate maximum', async () => {
        const quote = await aliceDelegate.getMaxQuote(
          tokenWETH.address,
          tokenDAI.address
        )
        equal(quote[1], 150)
        equal(quote[2], 46428)
      })
    })

    describe('Consumer', () => {
      it('Finds best price to buy 1 WETH for DAI', async () => {
        const quote = await consumer.findBestBuy(
          100,
          tokenWETH.address,
          tokenDAI.address,
          50
        )
        equal(quote[0], aliceDelegate.address)
        equal(quote[1], 30952)
      })

      it('Takes best price (Alice delegate)', async () => {
        // Alice delegate gets some WETH to trade throug her Delegate
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
        await consumer.takeBestBuy(
          100,
          tokenWETH.address,
          tokenDAI.address,
          50,
          {
            from: carolAddress,
          }
        )

        // Assert that Carol has taken 100 WETH from Alice
        equal(await tokenWETH.balanceOf(aliceAddress), 0)
        equal(await tokenWETH.balanceOf(carolAddress), 100)
      })

      it('Checks the new Delegate maximum', async () => {
        const result = await aliceDelegate.getMaxQuote(
          tokenWETH.address,
          tokenDAI.address
        )
        equal(result[1], 50)
        equal(result[2], 15476)
      })
    })
  }
)
