const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')
const DelegateFactory = artifacts.require('DelegateFactory')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')

const { tokenKinds, ADDRESS_ZERO, INDEX_HEAD } = require('@airswap/constants')
const {
  emitted,
  notEmitted,
  reverted,
  equal,
  ok,
  passes,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { padAddressToLocator } = require('@airswap/test-utils').padding

const LOCATORS = 0
const SCORES = 1
const NEXTID = 2

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
  const emptyLocator = padAddressToLocator(ADDRESS_ZERO)

  let whitelistedLocator

  const PROTOCOL_LIB_P2P = '0x1234'
  const PROTOCOL_DELEGATE = '0x9999'

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
    it('Bob creates a index (collection of intents) for WETH/DAI, LIBP2P', async () => {
      emitted(
        await indexer.createIndex(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          {
            from: bobAddress,
          }
        ),
        'CreateIndex'
      )
    })

    it('Bob tries to create a duplicate index (collection of intents) for WETH/DAI, LIBP2P', async () => {
      notEmitted(
        await indexer.createIndex(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          {
            from: bobAddress,
          }
        ),
        'CreateIndex'
      )
    })

    it('Bob tries to create another index for WETH/DAI, but for Delegates', async () => {
      emitted(
        await indexer.createIndex(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_DELEGATE,
          {
            from: bobAddress,
          }
        ),
        'CreateIndex'
      )
    })

    it('The owner can set and unset a locator whitelist for a locator type', async () => {
      types = await Types.new()
      await Swap.link('Types', types.address)

      const erc20TransferHandler = await ERC20TransferHandler.new()
      const transferHandlerRegistry = await TransferHandlerRegistry.new()
      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC20,
        erc20TransferHandler.address
      )
      // now deploy swap
      swapContract = await Swap.new(transferHandlerRegistry.address)
      delegateFactory = await DelegateFactory.new(
        swapContract.address,
        indexer.address,
        PROTOCOL_DELEGATE
      )

      await indexer.setLocatorWhitelist(
        PROTOCOL_DELEGATE,
        delegateFactory.address,
        {
          from: ownerAddress,
        }
      )

      let whitelist = await indexer.locatorWhitelists.call(PROTOCOL_DELEGATE)

      equal(whitelist, delegateFactory.address)

      await indexer.setLocatorWhitelist(PROTOCOL_DELEGATE, ADDRESS_ZERO, {
        from: ownerAddress,
      })

      whitelist = await indexer.locatorWhitelists.call(PROTOCOL_DELEGATE)

      equal(whitelist, ADDRESS_ZERO)
    })

    it('Bob ensures no intents are on the Indexer for existing index', async () => {
      result = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        PROTOCOL_LIB_P2P,
        ADDRESS_ZERO,
        10,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 0)
      equal(result[SCORES].length, 0)
      equal(result[NEXTID], INDEX_HEAD)
    })

    it('Bob ensures no intents are on the Indexer for non-existing index', async () => {
      result = await indexer.getLocators.call(
        tokenDAI.address,
        tokenWETH.address,
        PROTOCOL_LIB_P2P,
        ADDRESS_ZERO,
        10,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 0)
      equal(result[SCORES].length, 0)
      equal(result[NEXTID], ADDRESS_ZERO)
    })

    it('Alice attempts to stake and set an intent but fails due to no index', async () => {
      await reverted(
        indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          PROTOCOL_LIB_P2P,
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
          PROTOCOL_LIB_P2P,
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
        await indexer.unsetIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          {
            from: aliceAddress,
          }
        ),
        'Unstake'
      )
    })

    it('Fails due to no staking token balance', async () => {
      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          500,
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'ERC20: transfer amount exceeds balance'
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
          PROTOCOL_LIB_P2P,
          500,
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'ERC20: transfer amount exceeds allowance'
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
          PROTOCOL_LIB_P2P,
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
        await indexer.unsetIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          {
            from: aliceAddress,
          }
        ),
        'Unstake'
      )
      ok(await balances(aliceAddress, [[tokenAST, 1000]]))
      ok(await balances(indexerAddress, [[tokenAST, 0]]))
    })

    it('Bob can set an intent on 2 indexes for the same market', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
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

      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_DELEGATE,
          200,
          bobLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )

      // Bob has 200 fewer AST, now the indexer owns them
      ok(await balances(bobAddress, [[tokenAST, 400]]))
      ok(await balances(indexerAddress, [[tokenAST, 600]]))

      // check stake on p2p index
      let staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address,
        PROTOCOL_LIB_P2P
      )
      equal(staked, 400)

      // check stake on delegate index
      staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address,
        PROTOCOL_DELEGATE
      )
      equal(staked, 200)
    })

    it('Bob can increase his intent stake', async () => {
      // Now he updates his stake to be larger
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          800,
          bobLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )

      // Bob has 0 tokens and has staked 1000 total now (800 + 200)
      ok(await balances(bobAddress, [[tokenAST, 0]]))
      ok(await balances(indexerAddress, [[tokenAST, 1000]]))

      // confirm 800 is staked on p2p index
      const staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address,
        PROTOCOL_LIB_P2P
      )
      equal(staked, 800)
    })

    it('Bob can decrease his intent stake and change his locator', async () => {
      // Now he updates his stake to be smaller
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          1,
          aliceLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )

      // Bob has 799 tokens now (staked: 1 and 200)
      ok(await balances(bobAddress, [[tokenAST, 799]]))
      ok(await balances(indexerAddress, [[tokenAST, 201]]))

      // confirm 1 is staked on p2p index
      const staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address,
        PROTOCOL_LIB_P2P
      )
      equal(staked, 1)
    })

    it('Bob can keep the same stake amount', async () => {
      // Now he updates his stake to be the same
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          1,
          bobLocator,
          {
            from: bobAddress,
          }
        ),
        'Stake'
      )

      // Bob still has 799 tokens (staked: 1 and 200)
      ok(await balances(bobAddress, [[tokenAST, 799]]))
      ok(await balances(indexerAddress, [[tokenAST, 201]]))

      const staked = await indexer.getStakedAmount.call(
        bobAddress,
        tokenWETH.address,
        tokenDAI.address,
        PROTOCOL_LIB_P2P
      )
      equal(staked, 1)
    })

    it('Owner sets the locator whitelist for delegates, and alice cannot set intent', async () => {
      await indexer.setLocatorWhitelist(
        PROTOCOL_DELEGATE,
        delegateFactory.address,
        {
          from: ownerAddress,
        }
      )

      await reverted(
        indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_DELEGATE,
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

      // now alice can stake on the whitelisted index
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_DELEGATE,
          500,
          whitelistedLocator,
          {
            from: aliceAddress,
          }
        ),
        'Stake'
      )
    })

    it('Bob can remove his unwhitelisted intent from delegate index', async () => {
      emitted(
        await indexer.unsetIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_DELEGATE,
          {
            from: bobAddress,
          }
        ),
        'Unstake'
      )
    })

    it('Remove locator whitelist from delegate index', async () => {
      await indexer.setLocatorWhitelist(PROTOCOL_DELEGATE, ADDRESS_ZERO, {
        from: ownerAddress,
      })

      const whitelist = await indexer.locatorWhitelists.call(PROTOCOL_DELEGATE)

      equal(whitelist, ADDRESS_ZERO)
    })
  })

  describe('Intent integrity', async () => {
    it('Bob ensures only one intent is on the Index for libp2p', async () => {
      result = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        PROTOCOL_LIB_P2P,
        ADDRESS_ZERO,
        5,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 1)
      equal(result[LOCATORS][0], bobLocator)

      equal(result[SCORES].length, 1)
      equal(result[SCORES][0], 1)

      equal(result[NEXTID], INDEX_HEAD)
    })

    it('Alice attempts to unset non-existent index and reverts', async () => {
      await reverted(
        indexer.unsetIntent(
          tokenDAI.address,
          tokenWETH.address,
          PROTOCOL_LIB_P2P,
          {
            from: aliceAddress,
          }
        ),
        'INDEX_DOES_NOT_EXIST'
      )
    })

    it('Bob attempts to unset an intent and succeeds', async () => {
      emitted(
        await indexer.unsetIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          {
            from: bobAddress,
          }
        ),
        'Unstake'
      )
    })

    it('Alice unsets her intent on delegate index and succeeds', async () => {
      emitted(
        await indexer.unsetIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_DELEGATE,
          {
            from: aliceAddress,
          }
        ),
        'Unstake'
      )
    })

    it('Bob attempts to unset the intent he just unset and reverts', async () => {
      await reverted(
        indexer.unsetIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          {
            from: bobAddress,
          }
        ),
        'ENTRY_DOES_NOT_EXIST'
      )
    })

    it('Checks balances', async () => {
      ok(await balances(bobAddress, [[tokenAST, 1000]]))
      ok(await balances(aliceAddress, [[tokenAST, 1000]]))
      ok(await balances(indexerAddress, [[tokenAST, 0]]))
    })

    it('Bob ensures there are no more intents the Index for libp2p', async () => {
      result = await indexer.getLocators.call(
        tokenWETH.address,
        tokenDAI.address,
        PROTOCOL_LIB_P2P,
        ADDRESS_ZERO,
        10,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 0)
      equal(result[SCORES].length, 0)
      equal(result[NEXTID], INDEX_HEAD)
    })

    it('Alice attempts to set an intent for libp2p and succeeds', async () => {
      emitted(
        await indexer.setIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
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
        PROTOCOL_LIB_P2P,
        ADDRESS_ZERO,
        10,
        {
          from: bobAddress,
        }
      )

      equal(result[LOCATORS].length, 0)
      equal(result[SCORES].length, 0)
      equal(result[NEXTID], ADDRESS_ZERO)
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
          PROTOCOL_LIB_P2P,
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
        await indexer.unsetIntent(
          tokenWETH.address,
          tokenDAI.address,
          PROTOCOL_LIB_P2P,
          {
            from: aliceAddress,
          }
        ),
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
          PROTOCOL_LIB_P2P,
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
          PROTOCOL_LIB_P2P,
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
        PROTOCOL_LIB_P2P,
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

    it("shouldn't allow a locator of 0", async () => {
      // give mary 1000 staking tokens
      emitted(await tokenAST.mint(maliciousMary, 1000), 'Transfer')
      ok(await balances(maliciousMary, [[tokenAST, 1000]]))

      // mary gives permission for the tokens to be staked
      emitted(
        await tokenAST.approve(indexerAddress, 10000, { from: maliciousMary }),
        'Approval'
      )

      // create the index
      emitted(
        await indexer.createIndex(
          tokenDAI.address,
          tokenWETH.address,
          PROTOCOL_LIB_P2P,
          {
            from: maliciousMary,
          }
        ),
        'CreateIndex'
      )

      // mary tries to set intent with a locator of 0
      await reverted(
        indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          PROTOCOL_LIB_P2P,
          1000,
          emptyLocator,
          {
            from: maliciousMary,
          }
        ),
        'LOCATOR_MUST_BE_SENT'
      )
    })

    it("shouldn't allow a previous stake to be updated with locator 0", async () => {
      // mary sets an intent with bobs locator
      emitted(
        await indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          PROTOCOL_LIB_P2P,
          500,
          bobLocator,
          {
            from: maliciousMary,
          }
        ),
        'Stake'
      )

      // mary tries to sets intent with a locator of 0
      await reverted(
        indexer.setIntent(
          tokenDAI.address,
          tokenWETH.address,
          PROTOCOL_LIB_P2P,
          1000,
          emptyLocator,
          {
            from: maliciousMary,
          }
        ),
        'LOCATOR_MUST_BE_SENT'
      )
    })
  })
})
