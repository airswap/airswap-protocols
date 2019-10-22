const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')
const {
  emitted,
  notEmitted,
  reverted,
  equal,
  ok,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

let snapshotId

contract('Indexer', async ([ownerAddress, aliceAddress, bobAddress]) => {
  let indexer
  let indexerAddress

  let tokenAST
  let tokenDAI
  let tokenWETH

  let aliceLocator = padAddressToLocator(aliceAddress)

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
      indexer = await Indexer.new(tokenAST.address, EMPTY_ADDRESS, {
        from: ownerAddress,
      })
      indexerAddress = indexer.address
    })
  })

  describe('Index setup', async () => {
    it('Bob creates a index (collection of intents) for WETH/DAI', async () => {
      emitted(
        await indexer.createIndex(tokenWETH.address, tokenDAI.address, {
          from: bobAddress,
        }),
        'CreateIndex'
      )
    })

    it('Bob tries to create a duplicate index (collection of intents) for WETH/DAI', async () => {
      notEmitted(
        await indexer.createIndex(tokenWETH.address, tokenDAI.address, {
          from: bobAddress,
        }),
        'CreateIndex'
      )
    })

    it('Bob ensures no intents are on the Indexer for existing index', async () => {
      const intents = await indexer.getIntents.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 0)
    })

    it('Bob ensures no intents are on the Indexer for non-existing index', async () => {
      const intents = await indexer.getIntents.call(
        tokenDAI.address,
        tokenWETH.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 0)
    })

    it('Alice attempts to stake and set an intent but fails due to no index', async () => {
      await reverted(
        indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          100,
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'INDEX_DOES_NOT_EXIST'
      )
    })
  })

  describe('Staking', async () => {
    it('Alice attempts to stake with 0 and set an intent succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          0,
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })

    it('Alice attempts to unset an intent and succeeds', async () => {
      emitted(
        await indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
        'Unstake'
      )
    })

    it('Fails due to no staking token balance', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
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
          aliceLocator,
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
          aliceLocator,
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
      const intents = await indexer.getIntents.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 1)
    })

    it('Bob ensures that Alice intent is on the Indexer', async () => {
      const intents = await indexer.getIntents.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents[0], aliceLocator)
    })

    it('Alice attempts to unset non-existent index and reverts', async () => {
      await reverted(
        indexer.unsetIntent(tokenDAI.address, tokenWETH.address, {
          from: aliceAddress,
        }),
        'INDEX_DOES_NOT_EXIST'
      )
    })

    it('Alice attempts to unset an intent and succeeds', async () => {
      emitted(
        await indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
        'Unstake'
      )
    })

    it('Alice attempts to unset a non-existent intent and reverts', async () => {
      await reverted(
        indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
        'LOCATOR_DOES_NOT_EXIST'
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
        EMPTY_ADDRESS,
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
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })
  })
  describe('Blacklisting', async () => {
    it('Alice attempts to blacklist a index and fails because she is not owner', async () => {
      await reverted(
        indexer.addToBlacklist([tokenDAI.address], {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to blacklist a index and succeeds', async () => {
      emitted(
        await indexer.addToBlacklist([tokenDAI.address], {
          from: ownerAddress,
        }),
        'AddToBlacklist'
      )
    })

    it('Bob tries to fetch intent on blacklisted token which returns 0', async () => {
      const intents = await indexer.getIntents.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 0)
    })

    it('Owner attempts to blacklist same asset which does not emit a new event', async () => {
      notEmitted(
        await indexer.addToBlacklist([tokenDAI.address], {
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
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'PAIR_IS_BLACKLISTED'
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
        indexer.removeFromBlacklist([tokenDAI.address], {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to remove non-existent token from blacklist with no event emitted', async () => {
      notEmitted(
        await indexer.removeFromBlacklist([tokenAST.address], {
          from: ownerAddress,
        }),
        'RemoveFromBlacklist'
      )
    })

    it('Owner attempts to remove token from blacklist and succeeds', async () => {
      emitted(
        await indexer.removeFromBlacklist([tokenDAI.address], {
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
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })
  })
})
