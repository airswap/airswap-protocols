const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')
const DelegateFactory = artifacts.require('DelegateFactory')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const {
  emitted,
  notEmitted,
  reverted,
  equal,
  ok,
  passes,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

let snapshotId

contract('Indexer', async ([ownerAddress, aliceAddress, bobAddress]) => {
  let indexer
  let indexerAddress

  let delegateFactory
  let swapContract
  let types

  let tokenAST
  let tokenDAI
  let tokenWETH

  let aliceLocator = padAddressToLocator(aliceAddress)
  let bobLocator = padAddressToLocator(bobAddress)
  let emptyLocator = padAddressToLocator(EMPTY_ADDRESS)

  let whitelistedLocator

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
      indexer = await Indexer.new(tokenAST.address, {
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

    it('The owner can set and unset the locator whitelist', async () => {
      types = await Types.new()
      await Swap.link('Types', types.address)
      swapContract = await Swap.new()
      delegateFactory = await DelegateFactory.new(
        swapContract.address,
        indexer.address
      )

      await indexer.setLocatorWhitelist(delegateFactory.address, {
        from: ownerAddress,
      })

      let whitelist = await indexer.locatorWhitelist.call()

      equal(whitelist, delegateFactory.address)

      await indexer.setLocatorWhitelist(EMPTY_ADDRESS, {
        from: ownerAddress,
      })

      whitelist = await indexer.locatorWhitelist.call()

      equal(whitelist, EMPTY_ADDRESS)
    })

    it('Bob ensures no intents are on the Indexer for existing index', async () => {
      const intents = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 10)
      equal(intents[0], emptyLocator)
      equal(intents[1], emptyLocator)
    })

    it('Bob ensures no intents are on the Indexer for non-existing index', async () => {
      const intents = await indexer.getLocators.call(
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

    it('Staking tokens are minted for Alice and Bob', async () => {
      emitted(await tokenAST.mint(aliceAddress, 1000), 'Transfer')
      emitted(await tokenAST.mint(bobAddress, 1000), 'Transfer')
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

    it('Alice and Bob approve Indexer to spend staking tokens', async () => {
      emitted(
        await tokenAST.approve(indexerAddress, 10000, { from: aliceAddress }),
        'Approval'
      )
      emitted(
        await tokenAST.approve(indexerAddress, 10000, { from: bobAddress }),
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

    it("The owner can unset alice's intent", async () => {
      emitted(
        await indexer.unsetIntentForUser(
          aliceAddress,
          tokenWETH.address,
          tokenDAI.address,
          {
            from: ownerAddress,
          }
        ),
        'Unstake'
      )
      ok(await balances(aliceAddress, [[tokenAST, 1000]]))
      ok(await balances(indexerAddress, [[tokenAST, 0]]))
    })

    it('Bob can set an intent', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          400,
          bobLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )

      // Bob has 400 fewer AST, now the indexer owns them
      ok(await balances(bobAddress, [[tokenAST, 600]]))
      ok(await balances(indexerAddress, [[tokenAST, 400]]))

      let staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(staked, 400)
    })

    it('Bob can increase his intent stake', async () => {
      // Now he updates his stake to be larger
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          1000,
          bobLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )

      // Bob has 0 tokens and has staked 1000 total now
      ok(await balances(bobAddress, [[tokenAST, 0]]))
      ok(await balances(indexerAddress, [[tokenAST, 1000]]))

      let staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(staked, 1000)
    })

    it('Bob can decrease his intent stake and change his locator', async () => {
      // Now he updates his stake to be smaller
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          1,
          aliceLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )

      // Bob has 999 tokens now
      ok(await balances(bobAddress, [[tokenAST, 999]]))
      ok(await balances(indexerAddress, [[tokenAST, 1]]))

      let staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(staked, 1)
    })

    it('Bob can keep the same stake amount', async () => {
      // Now he updates his stake to be the same
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          1,
          bobLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )

      // Bob still has
      ok(await balances(bobAddress, [[tokenAST, 999]]))
      ok(await balances(indexerAddress, [[tokenAST, 1]]))

      let staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address
      )
      equal(staked, 1)
    })

    it('Owner sets the locator whitelist, and alice cannot set intent', async () => {
      await indexer.setLocatorWhitelist(delegateFactory.address, {
        from: ownerAddress,
      })

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
        'LOCATOR_NOT_WHITELISTED'
      )
    })

    it('Deploy a whitelisted delegate for alice', async () => {
      let tx = await delegateFactory.createDelegate(aliceAddress, aliceAddress)
      passes(tx)

      let whitelistedDelegate

      // emitted event
      emitted(tx, 'CreateDelegate', event => {
        whitelistedDelegate = event.delegateContract
        return (
          event.swapContract === swapContract.address &&
          event.indexerContract === indexer.address &&
          event.delegateContractOwner === aliceAddress &&
          event.delegateTradeWallet === aliceAddress
        )
      })

      whitelistedLocator = padAddressToLocator(whitelistedDelegate)

      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          whitelistedLocator,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })

    it('Bob can remove his unwhitelisted intent', async () => {
      emitted(
        await indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: bobAddress,
        }),
        'Unstake'
      )
    })

    it('Remove locator whitelist', async () => {
      await indexer.setLocatorWhitelist(EMPTY_ADDRESS, {
        from: ownerAddress,
      })

      let whitelist = await indexer.locatorWhitelist.call()

      equal(whitelist, EMPTY_ADDRESS)
    })
  })

  describe('Intent integrity', async () => {
    it('Bob ensures only one intent is on the Indexer', async () => {
      const intents = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        5,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 5)
      equal(intents[0], whitelistedLocator)
      equal(intents[1], emptyLocator)
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
        'ENTRY_DOES_NOT_EXIST'
      )
    })

    it('Checks balances', async () => {
      ok(await balances(aliceAddress, [[tokenAST, 1000]]))
      ok(await balances(indexerAddress, [[tokenAST, 0]]))
    })

    it('Bob ensures there are no more intents the Indexer', async () => {
      const intents = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 10)
      equal(intents[0], emptyLocator)
      equal(intents[1], emptyLocator)
    })

    it('Alice attempts to set an intent and succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          1000,
          whitelistedLocator,
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
        indexer.addToBlacklist(tokenDAI.address, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to blacklist a index and succeeds', async () => {
      emitted(
        await indexer.addToBlacklist(tokenDAI.address, {
          from: ownerAddress,
        }),
        'AddToBlacklist'
      )
    })

    it('Bob tries to fetch intent on blacklisted token which returns 0', async () => {
      const intents = await indexer.getLocators.call(
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
          whitelistedLocator,
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
        indexer.removeFromBlacklist(tokenDAI.address, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to remove non-existent token from blacklist with no event emitted', async () => {
      notEmitted(
        await indexer.removeFromBlacklist(tokenAST.address, {
          from: ownerAddress,
        }),
        'RemoveFromBlacklist'
      )
    })

    it('Owner attempts to remove token from blacklist and succeeds', async () => {
      emitted(
        await indexer.removeFromBlacklist(tokenDAI.address, {
          from: ownerAddress,
        }),
        'RemoveFromBlacklist'
      )
    })

    it('Alice and Bob attempt to stake and set an intent and succeed', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          whitelistedLocator,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          50,
          bobLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )
    })

    it('Bob fetches intents starting at bobAddress', async () => {
      const intents = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        bobAddress,
        3,
        {
          from: bobAddress,
        }
      )
      equal(intents.length, 3)
      equal(intents[0], bobLocator)
      equal(intents[1], emptyLocator)
      equal(intents[2], emptyLocator)
    })
  })

  describe('Pausing', async () => {
    it('A non-owner cannot pause the indexer', async () => {
      await reverted(
        indexer.setPausedStatus(true, { from: aliceAddress }),
        'Ownable: caller is not the owner'
      )
    })

    it('The owner can pause the indexer', async () => {
      let val = await indexer.contractPaused.call()
      equal(val, false)

      // pause the indexer
      await indexer.setPausedStatus(true, { from: ownerAddress })

      // now its paused
      val = await indexer.contractPaused.call()
      equal(val, true)
    })

    it('Functions cannot be called when the indexer is paused', async () => {
      // set intent
      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          1000,
          whitelistedLocator,
          {
            from: aliceAddress,
          }
        ),
        'CONTRACT_IS_PAUSED'
      )

      // unset intent
      await reverted(
        indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
        'CONTRACT_IS_PAUSED'
      )

      // create market
      await reverted(
        indexer.createIndex(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
        'CONTRACT_IS_PAUSED'
      )
    })

    it('The owner can un-pause the indexer', async () => {
      let val = await indexer.contractPaused.call()
      equal(val, true)

      // unpause the indexer
      await indexer.setPausedStatus(false, { from: ownerAddress })

      // now its not paused
      val = await indexer.contractPaused.call()
      equal(val, false)
    })

    it('Now functions can be called again', async () => {
      // unset intent
      emitted(
        await indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
        'Unstake'
      )

      // set intent
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          500,
          whitelistedLocator,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )

      // create market
      emitted(
        await indexer.createIndex(tokenDAI.address, bobAddress, {
          from: aliceAddress,
        }),
        'CreateIndex'
      )
    })
  })

  describe('Test killContract', async () => {
    it('A non-owner cannot call the function', async () => {
      await reverted(
        indexer.killContract(aliceAddress, { from: aliceAddress }),
        'Ownable: caller is not the owner'
      )
    })

    it('The owner cannot call the function when not paused', async () => {
      await reverted(
        indexer.killContract(ownerAddress, { from: ownerAddress }),
        'CONTRACT_NOT_PAUSED'
      )
    })

    it('The owner can call the function when the indexer is paused', async () => {
      // pause the indexer
      await indexer.setPausedStatus(true, { from: ownerAddress })
      // KILL
      await indexer.killContract(ownerAddress, { from: ownerAddress })

      let contractCode = await web3.eth.getCode(indexerAddress)
      equal(contractCode, '0x', 'contract did not self destruct')
    })
  })
})
