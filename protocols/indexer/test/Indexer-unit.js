const Indexer = artifacts.require('Indexer')
const Market = artifacts.require('Market')
const MockContract = artifacts.require('MockContract')

const {
  emitted,
  notEmitted,
  reverted,
  equal,
  passes,
} = require('@airswap/test-utils').assert
const {
  getTimestampPlusDays,
  revertToSnapShot,
  takeSnapshot,
} = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('Indexer Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[2]
  let bobAddress = accounts[3]

  let aliceLocator = padAddressToLocator(aliceAddress)
  let bobLocator = padAddressToLocator(bobAddress)

  let indexer
  let snapshotId
  let stakingTokenMock
  let stakingTokenAddress

  let whitelistMock
  let whitelistAddress
  let whitelistedIndexer

  let tokenOne = accounts[8]
  let tokenTwo = accounts[9]

  async function setupMockContracts() {
    stakingTokenMock = await MockContract.new()
    await stakingTokenMock.givenAnyReturnBool(true)

    stakingTokenAddress = stakingTokenMock.address

    whitelistMock = await MockContract.new()
    // address is not whitelisted
    await whitelistMock.givenAnyReturnBool(false)

    whitelistAddress = whitelistMock.address
  }

  async function checkMarketAtAddress(marketAddress, makerToken, takerToken) {
    // find the market
    let market = await Market.at(marketAddress)

    // fetch its tokens
    let marketMakerToken = await market.makerToken()
    let marketTakerToken = await market.takerToken()

    // check it has the correct tokens
    equal(
      marketMakerToken,
      makerToken,
      'Indexer has returned Market with incorrect maker token'
    )
    equal(
      marketTakerToken,
      takerToken,
      'Indexer has returned Market with incorrect taker token'
    )
  }

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Setup contracts', async () => {
    await setupMockContracts()
    indexer = await Indexer.new(stakingTokenAddress, EMPTY_ADDRESS)
    whitelistedIndexer = await Indexer.new(
      stakingTokenAddress,
      whitelistAddress
    )
  })

  describe('Check constructor', async () => {
    it('should set the staking token address correctly', async () => {
      const actualAddress = await indexer.stakeToken()
      equal(
        actualAddress,
        stakingTokenAddress,
        'Staking token was set incorrectly'
      )
    })
  })

  describe('Test createMarket', async () => {
    it('createMarket should emit an event and create a new market', async () => {
      let result = await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // event is emitted
      emitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenOne && event.takerToken === tokenTwo
      })

      // and a market with the correct tokens has been created
      let marketAddress = await indexer.createMarket.call(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      await checkMarketAtAddress(marketAddress, tokenOne, tokenTwo)
    })

    it('createMarket should just return an address if the market exists', async () => {
      // create the market - so that it already exists
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now trying to create it again will not emit the event
      let result = await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      notEmitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenOne && event.takerToken === tokenTwo
      })

      // instead the market's address is returned
      let marketAddress = await indexer.createMarket.call(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      await checkMarketAtAddress(marketAddress, tokenOne, tokenTwo)
    })
  })

  describe('Test addToBlacklist and removeFromBlacklist', async () => {
    it('should not allow a non-owner to blacklist a token', async () => {
      await reverted(
        indexer.addToBlacklist([tokenOne], {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to blacklist a token', async () => {
      let result = await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // check the event was emitted
      emitted(result, 'AddToBlacklist', event => {
        return event.token === tokenOne
      })

      // check the token is now on the blacklist
      let isBlacklisted = await indexer.blacklist.call(tokenOne)
      equal(isBlacklisted, true)
    })

    it('should not emit an event if token is already blacklisted', async () => {
      // add to blacklist
      await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // now try to add it again
      let tx = await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // passes but doesnt emit an event
      passes(tx)
      notEmitted(tx, 'AddToBlacklist')
    })

    it('should not allow a non-owner to un-blacklist a token', async () => {
      await reverted(
        indexer.removeFromBlacklist([tokenOne], {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to un-blacklist a token', async () => {
      // removing from blacklist before the token is blacklisted emits no events
      let result = await indexer.removeFromBlacklist([tokenOne], {
        from: owner,
      })
      notEmitted(result, 'RemoveFromBlacklist')
      passes(result)

      // Add the token to the blacklist
      await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // Now removing it succeeds and emits an event
      result = await indexer.removeFromBlacklist([tokenOne], {
        from: owner,
      })
      emitted(result, 'RemoveFromBlacklist', event => {
        return event.token === tokenOne
      })
      passes(result)
    })
  })

  describe('Test setIntent', async () => {
    it('should not set an intent if the market doesnt exist', async () => {
      await reverted(
        indexer.setIntent(
          tokenOne,
          tokenTwo,
          250,
          await getTimestampPlusDays(1),
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_DOES_NOT_EXIST'
      )
    })

    it('should not set an intent if the locator is not whitelisted', async () => {
      await reverted(
        whitelistedIndexer.setIntent(
          tokenOne,
          tokenTwo,
          250,
          await getTimestampPlusDays(1),
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'LOCATOR_NOT_WHITELISTED'
      )
    })

    it('should not set an intent if a token is blacklisted', async () => {
      // blacklist tokenOne
      await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // now try to stake with an amount less than 250
      await reverted(
        indexer.setIntent(
          tokenOne,
          tokenTwo,
          250,
          await getTimestampPlusDays(1),
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_IS_BLACKLISTED'
      )

      await indexer.removeFromBlacklist([tokenOne], {
        from: owner,
      })

      // blacklist tokenTwo
      await indexer.addToBlacklist([tokenTwo], {
        from: owner,
      })

      // now try to stake with an amount less than 250
      await reverted(
        indexer.setIntent(
          tokenOne,
          tokenTwo,
          250,
          await getTimestampPlusDays(1),
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_IS_BLACKLISTED'
      )
    })

    it('should not set an intent if the staking tokens arent approved', async () => {
      // make the market first
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // The transfer is not approved
      await stakingTokenMock.givenAnyReturnBool(false)

      // now try to set an intent
      await reverted(
        indexer.setIntent(
          tokenOne,
          tokenTwo,
          250,
          await getTimestampPlusDays(1),
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'UNABLE_TO_STAKE'
      )
    })

    it('should set a valid intent on a non-whitelisted indexer', async () => {
      // make the market first
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      let expiry = await getTimestampPlusDays(1)

      // now set an intent
      let result = await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        expiry,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )
      passes(result)

      emitted(result, 'Stake', event => {
        return (
          event.wallet === aliceAddress &&
          event.makerToken === tokenOne &&
          event.takerToken == tokenTwo &&
          event.amount.toNumber() === 250 &&
          event.expiry.toNumber() === expiry
        )
      })
    })

    it('should set a valid intent on a whitelisted indexer', async () => {
      // make the market first
      await whitelistedIndexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // whitelist the locator
      await whitelistMock.givenAnyReturnBool(true)

      let expiry = await getTimestampPlusDays(1)

      // now set an intent
      let result = await whitelistedIndexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        expiry,
        bobLocator,
        {
          from: bobAddress,
        }
      )
      passes(result)

      emitted(result, 'Stake', event => {
        return (
          event.wallet === bobAddress &&
          event.makerToken === tokenOne &&
          event.takerToken == tokenTwo &&
          event.amount.toNumber() === 250 &&
          event.expiry.toNumber() === expiry
        )
      })
    })

    it('should not set an intent if the user has already staked', async () => {
      // make the market first
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // set one intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        await getTimestampPlusDays(1),
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      // now try to set another
      await reverted(
        indexer.setIntent(
          tokenOne,
          tokenTwo,
          250,
          await getTimestampPlusDays(2),
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'USER_ALREADY_STAKED'
      )
    })
  })

  describe('Test unsetIntent', async () => {
    it('should not unset an intent if the market doesnt exist', async () => {
      await reverted(
        indexer.unsetIntent(tokenOne, tokenTwo, {
          from: aliceAddress,
        }),
        'MARKET_DOES_NOT_EXIST'
      )
    })

    it('should not unset an intent if the intent doesnt exist', async () => {
      // create the market
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now try to unset a non-existent intent
      await reverted(
        indexer.unsetIntent(tokenOne, tokenTwo, {
          from: aliceAddress,
        }),
        'INTENT_DOES_NOT_EXIST'
      )
    })

    it('should successfully unset an intent', async () => {
      // create the market
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // create the intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        await getTimestampPlusDays(3),
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      // now try to unset the intent
      let tx = await indexer.unsetIntent(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // passes and emits and event
      passes(tx)
      emitted(tx, 'Unstake', event => {
        return (
          event.wallet === aliceAddress &&
          event.makerToken === tokenOne &&
          event.takerToken == tokenTwo &&
          event.amount.toNumber() === 250
        )
      })
    })
  })

  describe('Test getIntents', async () => {
    it('should return an empty array if the market doesnt exist', async () => {
      let intents = await indexer.getIntents.call(tokenOne, tokenTwo, 4)
      equal(intents.length, 0, 'intents array should be empty')
    })

    it('should return an empty array if a token is blacklisted', async () => {
      // create market
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // set an intent staking 0
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        0,
        await getTimestampPlusDays(1),
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      // blacklist tokenOne
      await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // now try to get the intents
      let intents = await indexer.getIntents.call(tokenOne, tokenTwo, 4)
      equal(intents.length, 0, 'intents array should be empty')
    })

    it('should otherwise return the intents', async () => {
      // create market
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // set two intents
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        50,
        await getTimestampPlusDays(1),
        aliceLocator,
        {
          from: aliceAddress,
        }
      )
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        100,
        await getTimestampPlusDays(1),
        bobLocator,
        {
          from: bobAddress,
        }
      )

      // now try to get the intents
      let intents = await indexer.getIntents.call(tokenOne, tokenTwo, 4)
      equal(intents.length, 2, 'intents array should be size 2')

      // should only get the number specified
      intents = await indexer.getIntents.call(tokenOne, tokenTwo, 1)
      equal(intents.length, 1, 'intents array should be size 1')
    })
  })

  describe('Test cleanExpiredIntents', async () => {
    it("should revert if the market doesn't exist", async () => {
      await reverted(
        indexer.cleanExpiredIntents(tokenOne, tokenTwo, aliceAddress, 3),
        'MARKET_DOES_NOT_EXIST'
      )
    })

    it("shouldn't remove intents if they not have expired")

    it("shouldn't remove intents if expired intents aren't in count")

    it('should remove expired intents in count')
  })
})
