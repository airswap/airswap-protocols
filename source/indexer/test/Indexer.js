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
const {
  EMPTY_ADDRESS,
  HEAD,
  LOCATORS,
  SCORES,
  NEXTID,
} = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('Indexer', async accounts => {
  const ownerAddress = accounts[0]
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]
  const maliciousMary = accounts[9]

  let indexer
  let indexerAddress

  let delegateFactory
  let swapContract
  let types

  let tokenAST
  let tokenDAI
  let tokenWETH

  let result

  const aliceLocator = padAddressToLocator(aliceAddress)
  const bobLocator = padAddressToLocator(bobAddress)
  const emptyLocator = padAddressToLocator(EMPTY_ADDRESS)

  let whitelistedLocator

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
      result = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 0)
      equal(result[SCORES].length, 0)
      equal(result[NEXTID], HEAD)
    })

    it('Bob ensures no intents are on the Indexer for non-existing index', async () => {
      result = await indexer.getLocators.call(
        tokenDAI.address,
        tokenWETH.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 0)
      equal(result[SCORES].length, 0)
      equal(result[NEXTID], EMPTY_ADDRESS)
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

    it("The Alice can unset alice's intent", async () => {
      emitted(
        await indexer.unsetIntent(tokenWETH.address, tokenDAI.address, {
          from: aliceAddress,
        }),
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

      const staked = await indexer.getStakedAmount.call(
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

      const staked = await indexer.getStakedAmount.call(
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

      const staked = await indexer.getStakedAmount.call(
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

      const staked = await indexer.getStakedAmount.call(
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
      const tx = await delegateFactory.createDelegate(aliceAddress, {
        from: aliceAddress,
      })
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

      const whitelist = await indexer.locatorWhitelist.call()

      equal(whitelist, EMPTY_ADDRESS)
    })
  })

  describe('Intent integrity', async () => {
    it('Bob ensures only one intent is on the Indexer', async () => {
      result = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        5,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 1)
      equal(result[LOCATORS][0], whitelistedLocator)

      equal(result[SCORES].length, 1)
      equal(result[SCORES][0], 500)

      equal(result[NEXTID], HEAD)
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
      result = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 0)
      equal(result[SCORES].length, 0)
      equal(result[NEXTID], HEAD)
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
        indexer.addTokenToBlacklist(tokenDAI.address, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to blacklist a index and succeeds', async () => {
      emitted(
        await indexer.addTokenToBlacklist(tokenDAI.address, {
          from: ownerAddress,
        }),
        'AddTokenToBlacklist'
      )
    })

    it('Bob tries to fetch intent on blacklisted token', async () => {
      result = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        EMPTY_ADDRESS,
        10,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 0)
      equal(result[SCORES].length, 0)
      equal(result[NEXTID], EMPTY_ADDRESS)
    })

    it('Owner attempts to blacklist same asset which does not emit a new event', async () => {
      notEmitted(
        await indexer.addTokenToBlacklist(tokenDAI.address, {
          from: ownerAddress,
        }),
        'AddTokenToBlacklist'
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
        indexer.removeTokenFromBlacklist(tokenDAI.address, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('Owner attempts to remove non-existent token from blacklist with no event emitted', async () => {
      notEmitted(
        await indexer.removeTokenFromBlacklist(tokenAST.address, {
          from: ownerAddress,
        }),
        'RemoveTokenFromBlacklist'
      )
    })

    it('Owner attempts to remove token from blacklist and succeeds', async () => {
      emitted(
        await indexer.removeTokenFromBlacklist(tokenDAI.address, {
          from: ownerAddress,
        }),
        'RemoveTokenFromBlacklist'
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
      result = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        bobAddress,
        3,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 2)
      equal(result[LOCATORS][0], bobLocator)
      equal(result[LOCATORS][1], emptyLocator)

      equal(result[SCORES].length, 2)
      equal(result[SCORES][0], 50)
      equal(result[SCORES][1], 0)
    })

    it("doesn't lock tokens when given a locator of 0", async () => {
      // give mary 1000 staking tokens
      emitted(await tokenAST.mint(maliciousMary, 1000), 'Transfer')
      ok(await balances(maliciousMary, [[tokenAST, 1000]]))

      // mary gives permission for the tokens to be staked
      emitted(
        await tokenAST.approve(indexerAddress, 10000, { from: maliciousMary }),
        'Approval'
      )
      const indexerBefore = await tokenAST.balanceOf(indexerAddress)

      // create the index
      emitted(
        await indexer.createIndex(tokenDAI.address, tokenWETH.address, {
          from: maliciousMary,
        }),
        'CreateIndex'
      )

      // mary sets intent with a locator of 0 and stakes 1000 AST
      emitted(
        await indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          1000,
          emptyLocator,
          {
            from: maliciousMary,
          }
        ),
        'Stake'
      )

      // check balances have updated by 1000
      ok(await balances(maliciousMary, [[tokenAST, 0]]))
      ok(
        await balances(indexerAddress, [
          [tokenAST, indexerBefore.toNumber() + 1000],
        ])
      )

      // mary stakes again, this time with a stake of 0
      emitted(
        await indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          0,
          bobLocator,
          {
            from: maliciousMary,
          }
        ),
        'Stake'
      )

      // Check mary's entry updated
      const result = await indexer.getLocators(
        tokenDAI.address,
        tokenWETH.address,
        maliciousMary,
        1
      )

      equal(result[LOCATORS][0], bobLocator)
      equal(result[SCORES][0], 0)

      // Check mary got her tokens back
      ok(
        await balances(maliciousMary, [[tokenAST, 1000]]),
        'Mary did not get her tokens back'
      )
      ok(await balances(indexerAddress, [[tokenAST, indexerBefore]]))
    })
  })
})
