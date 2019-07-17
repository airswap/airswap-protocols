const Indexer = artifacts.require('Indexer')
const Market = artifacts.require('Market')
const FungibleToken = artifacts.require('FungibleToken')

const ONE_DAY = 60 * 60 * 24

const {
  emitted,
  reverted,
  equal,
  ok,
  getResult,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { getLatestTimestamp } = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')

const ALICE_LOC = intents.serialize(
  intents.Locators.URL,
  'https://rpc.maker-cloud.io:1123'
)

contract('Indexer', ([ownerAddress, aliceAddress, bobAddress]) => {
  let indexer
  let indexerAddress

  let tokenAST
  let tokenDAI
  let tokenWETH

  let marketContract

  describe('Deploying...', () => {
    it('Deployed staking token "AST"', async () => {
      tokenAST = await FungibleToken.deployed()
    })

    it('Deployed trading token "DAI"', async () => {
      tokenDAI = await FungibleToken.new()
    })

    it('Deployed trading token "WETH"', async () => {
      tokenWETH = await FungibleToken.new()
    })

    it('Deployed Indexer contract', async () => {
      indexer = await Indexer.deployed({ from: ownerAddress })
      indexerAddress = indexer.address
      emitted(await indexer.setStakeMinimum(500), 'SetStakeMinimum')
    })
  })

  describe('Market setup', () => {
    it('Bob creates a market (collection of intents) for WETH/DAI', async () => {
      let marketContractAddress
      emitted(
        (tx = await indexer.createMarket(tokenWETH.address, tokenDAI.address, {
          from: bobAddress,
        })),
        'CreateMarket'
      )
      marketContract = await Market.at(tx.logs[0].address)
    })

    it('Bob ensures no intents are on the Indexer', async () => {
      equal(await indexer.lengthOf(tokenWETH.address, tokenDAI.address), 0)
    })

    it('Alice attempts to stake and set an intent but fails due to no market', async () => {
      await reverted(
        indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          100,
          1,
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_DOES_NOT_EXIST'
      )
    })

    it('Alice attempts to stake and set an intent but fails due to minimum', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          100,
          1,
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'MINIMUM_NOT_MET'
      )
    })
  })

  describe('Staking', () => {
    it('Fails due to no staking token balance', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          1,
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'SafeMath: subtraction overflow'
      )
    })

    it('Staking tokens are minted for Alice', async () => {
      emitted(await tokenAST.mint(aliceAddress, 1000), 'Transfer')
    })

    it('Fails due to no staking token allowance', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          1,
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'SafeMath: subtraction overflow'
      )
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
          1,
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })

    it('Checks balances', async () => {
      ok(balances(aliceAddress, [[tokenAST, 500]]))
      ok(balances(indexerAddress, [[tokenAST, 500]]))
    })
  })

  describe('Intent integrity', () => {
    it('Bob ensures only one intent is on the Indexer', async () => {
      equal(await indexer.lengthOf(tokenWETH.address, tokenDAI.address), 1)
    })

    it('Bob ensures that Alice intent is on the Indexer', async () => {
      const intents = await indexer.getIntents(
        tokenWETH.address,
        tokenDAI.address,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents[0], ALICE_LOC)
    })

    it('Alice attempts to unset an intent and succeeds', async () => {
      emitted(
        await indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
        'Unstake'
      )
    })

    it('Checks balances', async () => {
      ok(balances(aliceAddress, [[tokenAST, 1000]]))
      ok(balances(indexerAddress, [[tokenAST, 0]]))
    })

    it('Bob ensures there are no more intents the Indexer', async () => {
      const intents = await indexer.getIntents(
        tokenWETH.address,
        tokenDAI.address,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 0)
    })

    it('Alice attempts to set an intent and succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          1000,
          1,
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })
  })
  describe('Blacklisting', () => {
    it('Alice attempts to blacklist a market and fails because she is not owner', async () => {
      await reverted(
        indexer.addToBlacklist(tokenDAI.address, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to blacklist a market and succeeds', async () => {
      emitted(
        await indexer.addToBlacklist(tokenDAI.address, {
          from: ownerAddress,
        }),
        'AddToBlacklist'
      )
    })

    it('Alice attempts to stake and set an intent and fails due to blacklist', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          1000,
          1,
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_IS_BLACKLISTED'
      )
    })

    it('Alice attempts to unset an intent and succeeds regardless of blacklist', async () => {
      emitted(
        await indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
        'Unstake'
      )
    })

    it('Alice attempts to remove from blacklist fails because she is not owner', async () => {
      await reverted(
        indexer.removeFromBlacklist(tokenDAI.address, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to remove from blacklist and succeeds', async () => {
      emitted(
        await indexer.removeFromBlacklist(tokenDAI.address, {
          from: ownerAddress,
        }),
        'RemoveFromBlacklist'
      )
    })

    it('Alice attempts to stake 500 for 1 period and results in score of 500', async () => {
      const result = await indexer.setIntent(
        tokenWETH.address,
        tokenDAI.address,
        500,
        1,
        ALICE_LOC,
        {
          from: aliceAddress,
        }
      )

      const timestamp = await getLatestTimestamp()
      emitted(await getResult(marketContract, result.tx), 'SetIntent', ev => {
        return (
          ev.expiry.toNumber() - timestamp === ONE_DAY &&
          ev.amount.toNumber() == 500
        )
      })
    })

    it('Alice attempts to stake 500 for 4 periods and results in score of 125', async () => {
      let result = await indexer.setIntent(
        tokenWETH.address,
        tokenDAI.address,
        500,
        4,
        ALICE_LOC,
        {
          from: aliceAddress,
        }
      )

      const timestamp = await getLatestTimestamp()
      emitted(await getResult(marketContract, result.tx), 'SetIntent', ev => {
        return (
          ev.expiry.toNumber() - timestamp === ONE_DAY * 4 &&
          ev.amount.toNumber() == 125
        )
      })
    })
  })
})
