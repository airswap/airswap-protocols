const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal, ok } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { getTimestampPlusDays } = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')

const ALICE_LOC = intents.serialize(
  intents.Locators.URL,
  'https://rpc.maker-cloud.io:1123'
)

contract('Indexer', accounts => {
  let owner = accounts[0]
  let aliceAddress = accounts[1]
  let bobAddress = accounts[2]

  let indexer

  let stakingToken

  let tokenDAI = accounts[3]
  let tokenWETH = accounts[4]

  let snapshotId

  before('Deploys all the things', async () => {
    stakingToken = await FungibleToken.deployed()

    indexer = await Indexer.new(stakingToken.address, 250, { from: owner })
  })

  beforeEach(async () => {
    let snapshot = await takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  describe('Market setup', () => {
    it('Bob creates a market (collection of intents) for WETH/DAI', async () => {
      emitted(
        await indexer.createMarket(tokenWETH, tokenDAI, {
          from: bobAddress,
        }),
        'CreateMarket'
      )
    })

    it('Bob ensures no intents are on the new market', async () => {
      await indexer.createMarket(tokenWETH, tokenDAI, { from: bobAddress })
      equal(await indexer.lengthOf(tokenWETH, tokenDAI), 0)
    })

    it('Alice attempts to set an intent but fails as there isnt a market', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH,
          tokenDAI,
          250,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          { from: aliceAddress }
        ),
        'MARKET_DOES_NOT_EXIST'
      )
    })

    it('Alice attempts to set an intent but fails as she doesnt stake enough tokens', async () => {
      await indexer.createMarket(tokenWETH, tokenDAI, { from: bobAddress })
      await reverted(
        indexer.setIntent(
          tokenWETH,
          tokenDAI,
          100,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          { from: aliceAddress }
        ),
        'MINIMUM_NOT_MET'
      )
    })
  })

  describe('Staking', () => {
    beforeEach(async () => {
      await indexer.createMarket(tokenWETH, tokenDAI, { from: bobAddress })
    })

    it('Fails due to no staking token balance', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH,
          tokenDAI,
          500,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'SafeMath: subtraction overflow'
      )
    })

    it('Fails due to no staking token allowance', async () => {
      // mint alice tokens
      emitted(await stakingToken.mint(aliceAddress, 1000), 'Transfer')

      // try to set intent without approving the indexer
      await reverted(
        indexer.setIntent(
          tokenWETH,
          tokenDAI,
          500,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'SafeMath: subtraction overflow'
      )
    })

    it('Succeeds when token allowance is given to the indexer', async () => {
      // mint alice tokens
      emitted(await stakingToken.mint(aliceAddress, 1000), 'Transfer')

      // approve the indexer to use those tokens
      emitted(
        await stakingToken.approve(indexer.address, 500, {
          from: aliceAddress,
        }),
        'Approval'
      )

      // check token balances before the staking
      ok(balances(aliceAddress, [[stakingToken, 1000]]))
      ok(balances(indexer.address, [[stakingToken, 0]]))

      // staking succeeds
      emitted(
        await indexer.setIntent(
          tokenWETH,
          tokenDAI,
          500,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )

      // check there is now 1 intent in getIntent
      const intents = await indexer.getIntents(tokenWETH, tokenDAI, 10, {
        from: bobAddress,
      })
      equal(intents.length, 1)

      // check balances of staking token have changed
      ok(balances(aliceAddress, [[stakingToken, 500]]))
      ok(balances(indexer.address, [[stakingToken, 500]]))
    })

    it('Fails when Alice sets a second intent', async () => {
      // mint alice tokens and approve indexer
      emitted(await stakingToken.mint(aliceAddress, 1000), 'Transfer')
      emitted(
        await stakingToken.approve(indexer.address, 1000, {
          from: aliceAddress,
        }),
        'Approval'
      )

      // staking succeeds
      emitted(
        await indexer.setIntent(
          tokenWETH,
          tokenDAI,
          500,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )

      // check indexer balance and number of intents
      ok(balances(indexer.address, [[stakingToken, 500]]))
      let intents = await indexer.getIntents(tokenWETH, tokenDAI, 10, {
        from: bobAddress,
      })
      equal(intents.length, 1)

      // a second staking fails
      await reverted(
        indexer.setIntent(
          tokenWETH,
          tokenDAI,
          500,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'USER_ALREADY_STAKED'
      )

      // Indexer balance has not increased and theres still just 1 intent
      ok(balances(indexer.address, [[stakingToken, 500]]))
      intents = await indexer.getIntents(tokenWETH, tokenDAI, 10, {
        from: bobAddress,
      })
      equal(intents.length, 1)
    })
  })

  describe('Intent integrity', () => {
    beforeEach(async () => {
      // we start with a market with 1 intent from alice
      // create market
      await indexer.createMarket(tokenWETH, tokenDAI, { from: bobAddress })

      // mint alice staking tokens and approve the indexer to use them
      emitted(await stakingToken.mint(aliceAddress, 1000), 'Transfer')
      emitted(
        await stakingToken.approve(indexer.address, 1000, {
          from: aliceAddress,
        }),
        'Approval'
      )

      // Set alice's intent
      emitted(
        await indexer.setIntent(
          tokenWETH,
          tokenDAI,
          500,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })

    it('Bob ensures only one intent is on the Indexer', async () => {
      equal(await indexer.lengthOf(tokenWETH, tokenDAI), 1)
    })

    it("Bob ensures that Alice's intent is on the Indexer", async () => {
      const intents = await indexer.getIntents(tokenWETH, tokenDAI, 10, {
        from: bobAddress,
      })
      equal(intents[0], ALICE_LOC)
    })

    it('Alice attempts to unset an intent and succeeds', async () => {
      // check before balances
      ok(balances(aliceAddress, [[stakingToken, 500]]))
      ok(balances(indexer.address, [[stakingToken, 500]]))

      emitted(
        await indexer.unsetIntent(tokenWETH, tokenDAI, {
          from: aliceAddress,
        }),
        'Unstake'
      )

      // this should update the balances - returning alices tokens
      ok(balances(aliceAddress, [[stakingToken, 1000]]))
      ok(balances(indexer.address, [[stakingToken, 0]]))
    })

    it('Bob ensures removing intents decreases the length', async () => {
      // There is 1 intent before removal
      let intents = await indexer.getIntents(tokenWETH, tokenDAI, 10, {
        from: bobAddress,
      })
      equal(intents.length, 1)

      // The intent is removed
      emitted(
        await indexer.unsetIntent(tokenWETH, tokenDAI, {
          from: aliceAddress,
        }),
        'Unstake'
      )

      // Now there are no intents
      intents = await indexer.getIntents(tokenWETH, tokenDAI, 10, {
        from: bobAddress,
      })
      equal(intents.length, 0)
    })

    it('Alice attempts to set an intent and succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH,
          tokenDAI,
          500,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
      let intents = await indexer.getIntents(tokenWETH, tokenDAI, 10, {
        from: bobAddress,
      })


      ok(balances(aliceAddress, [[stakingToken, 0]]))
      ok(balances(indexer.address, [[stakingToken, 1000]]))
    })
  })
  describe('Blacklisting', () => {
    it('Alice attempts to blacklist a market and fails because she is not owner', async () => {
      await reverted(
        indexer.addToBlacklist(tokenDAI, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to blacklist a market and succeeds', async () => {
      emitted(
        await indexer.addToBlacklist(tokenDAI, {
          from: owner,
        }),
        'AddToBlacklist'
      )
    })

    it('Alice attempts to stake and set an intent and fails due to blacklist', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH,
          tokenDAI,
          1000,
          await getTimestampPlusDays(1),
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
        await indexer.unsetIntent(tokenWETH, tokenDAI, {
          from: aliceAddress,
        }),
        'Unstake'
      )
    })

    it('Alice attempts to remove from blacklist fails because she is not owner', async () => {
      await reverted(
        indexer.removeFromBlacklist(tokenDAI, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to blacklist a market and succeeds', async () => {
      emitted(
        await indexer.removeFromBlacklist(tokenDAI, {
          from: owner,
        }),
        'RemoveFromBlacklist'
      )
    })

    it('Alice attempts to stake and set an intent and succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH,
          tokenDAI,
          500,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })

    it('Bob creates the other side of the market for WETH/DAI', async () => {
      emitted(
        await indexer.createTwoSidedMarket(tokenDAI, tokenWETH, {
          from: bobAddress,
        }),
        'CreateMarket'
      )
    })

    it('Alice attempts to stake and set a two-sided intent and succeeds', async () => {
      let result = await indexer.setTwoSidedIntent(
        tokenWETH,
        tokenDAI,
        250,
        await getTimestampPlusDays(1),
        ALICE_LOC,
        {
          from: aliceAddress,
        }
      )
      emitted(result, 'Stake', ev => {
        return (
          ev.makerToken == tokenWETH &&
          ev.takerToken == tokenDAI &&
          ev.amount == 250
        )
      })
      emitted(result, 'Stake', ev => {
        return (
          ev.makerToken == tokenDAI &&
          ev.takerToken == tokenWETH &&
          ev.amount == 250
        )
      })
    })
  })
})
