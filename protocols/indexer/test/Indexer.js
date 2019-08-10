const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal, ok } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const {
  getTimestampPlusDays,
  takeSnapshot,
  revertToSnapShot,
} = require('@airswap/test-utils').time

let snapshotId

contract('Indexer', async ([ownerAddress, aliceAddress, bobAddress]) => {
  let indexer
  let indexerAddress

  let tokenAST
  let tokenDAI
  let tokenWETH

  before('Setup', async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  after(async () => {
    await revertToSnapShot(snapshotId)
  })

  describe('Deploying...', async () => {
    it('Deployed staking token "AST"', async () => {
      tokenAST = await FungibleToken.new()
    })

    it('Deployed trading token "DAI"', async () => {
      tokenDAI = await FungibleToken.new()
    })

    it('Deployed trading token "WETH"', async () => {
      tokenWETH = await FungibleToken.new()
    })

    it('Deployed Indexer contract', async () => {
      indexer = await Indexer.new(tokenAST.address, { from: ownerAddress })
      indexerAddress = indexer.address
    })
  })

  describe('Market setup', async () => {
    it('Bob creates a market (collection of intents) for WETH/DAI', async () => {
      emitted(
        await indexer.createMarket(tokenWETH.address, tokenDAI.address, {
          from: bobAddress,
        }),
        'CreateMarket'
      )
    })

    it('Bob ensures no intents are on the Indexer', async () => {
      const intents = await indexer.getIntents.call(
        tokenWETH.address,
        tokenDAI.address,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 0)
    })

    it('Alice attempts to stake and set an intent but fails due to no market', async () => {
      await reverted(
        indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          100,
          await getTimestampPlusDays(1),
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_DOES_NOT_EXIST'
      )
    })
  })

  describe('Staking', async () => {
    it('Fails due to no staking token balance', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          await getTimestampPlusDays(1),
          aliceAddress,
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
          await getTimestampPlusDays(1),
          aliceAddress,
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
      ok(await balances(aliceAddress, [[tokenAST, 1000]]))
      ok(await balances(indexerAddress, [[tokenAST, 0]]))
    })

    it('Alice attempts to stake and set an intent succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          await getTimestampPlusDays(1),
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })

    it('Checks balances', async () => {
      ok(await balances(aliceAddress, [[tokenAST, 500]]))
      ok(await balances(indexerAddress, [[tokenAST, 500]]))
    })
  })

  describe('Intent integrity', async () => {
    it('Bob ensures only one intent is on the Indexer', async () => {
      it('Bob ensures no intents are on the Indexer', async () => {
        const intents = await indexer.getIntents.call(
          tokenWETH.address,
          tokenDAI.address,
          10,
          {
            from: bobAddress,
          }
        )
        equal(intents.length, 1)
      })
    })

    it('Bob ensures that Alice intent is on the Indexer', async () => {
      const intents = await indexer.getIntents.call(
        tokenWETH.address,
        tokenDAI.address,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents[0], aliceAddress)
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
      ok(await balances(aliceAddress, [[tokenAST, 1000]]))
      ok(await balances(indexerAddress, [[tokenAST, 0]]))
    })

    it('Bob ensures there are no more intents the Indexer', async () => {
      const intents = await indexer.getIntents.call(
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
          await getTimestampPlusDays(1),
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })
  })
  describe('Blacklisting', async () => {
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
          await getTimestampPlusDays(1),
          aliceAddress,
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

    it('Owner attempts to blacklist a market and succeeds', async () => {
      emitted(
        await indexer.removeFromBlacklist(tokenDAI.address, {
          from: ownerAddress,
        }),
        'RemoveFromBlacklist'
      )
    })

    it('Alice attempts to stake and set an intent and succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          await getTimestampPlusDays(1),
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })
  })
})
