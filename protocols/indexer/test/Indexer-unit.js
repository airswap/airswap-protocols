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

contract('Indexer Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[2]
  let bobAddress = accounts[3]

  let indexer
  let snapshotId
  let stakingTokenMock
  let stakingTokenAddress

  let tokenOne = accounts[8]
  let tokenTwo = accounts[9]

  async function setupMockToken() {
    stakingTokenMock = await MockContract.new()
    await stakingTokenMock.givenAnyReturnBool(true)

    stakingTokenAddress = stakingTokenMock.address
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
    await setupMockToken()
    indexer = await Indexer.new(stakingTokenAddress)
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
        indexer.addToBlacklist(tokenOne, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to blacklist a token', async () => {
      let result = await indexer.addToBlacklist(tokenOne, {
        from: owner,
      })

      // check the event was emitted
      emitted(result, 'AddToBlacklist', event => {
        return event.token === tokenOne
      })

      // get the timestamp of the block that added the token to the blacklist
      let txTimestamp = (await web3.eth.getBlock(result.receipt.blockHash))
        .timestamp

      // check the token is now on the blacklist
      let isBlacklisted = await indexer.blacklist.call(tokenOne)
      equal(
        txTimestamp,
        isBlacklisted,
        'token was not blacklisted with correct timestamp'
      )
    })

    it('should not emit an event if token is already blacklisted', async () => {
      // add to blacklist
      await indexer.addToBlacklist(tokenOne, {
        from: owner,
      })

      // now try to add it again
      let tx = await indexer.addToBlacklist(tokenOne, {
        from: owner,
      })

      // passes but doesnt emit an event
      passes(tx)
      notEmitted(tx, 'AddToBlacklist')
    })

    it('should not allow a non-owner to un-blacklist a token', async () => {
      await reverted(
        indexer.removeFromBlacklist(tokenOne, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to un-blacklist a token', async () => {
      // removing from blacklist before the token is blacklisted emits no events
      let result = await indexer.removeFromBlacklist(tokenOne, {
        from: owner,
      })
      notEmitted(result, 'RemoveFromBlacklist')
      passes(result)

      // Add the token to the blacklist
      await indexer.addToBlacklist(tokenOne, {
        from: owner,
      })

      // Now removing it succeeds and emits an event
      result = await indexer.removeFromBlacklist(tokenOne, {
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
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_DOES_NOT_EXIST'
      )
    })

    it('should not set an intent if a token is blacklisted', async () => {
      // blacklist tokenOne
      await indexer.addToBlacklist(tokenOne, {
        from: owner,
      })

      // now try to stake with an amount less than 250
      await reverted(
        indexer.setIntent(
          tokenOne,
          tokenTwo,
          250,
          await getTimestampPlusDays(1),
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_IS_BLACKLISTED'
      )

      await indexer.removeFromBlacklist(tokenOne, {
        from: owner,
      })

      // blacklist tokenTwo
      await indexer.addToBlacklist(tokenTwo, {
        from: owner,
      })

      // now try to stake with an amount less than 250
      await reverted(
        indexer.setIntent(
          tokenOne,
          tokenTwo,
          250,
          await getTimestampPlusDays(1),
          aliceAddress,
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
          aliceAddress,
          {
            from: aliceAddress,
          }
        ),
        'UNABLE_TO_STAKE'
      )
    })

    it('should set a valid intent and emit an event', async () => {
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
        aliceAddress,
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
        aliceAddress,
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
          aliceAddress,
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
        aliceAddress,
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

      // set an intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        await getTimestampPlusDays(1),
        aliceAddress,
        {
          from: aliceAddress,
        }
      )

      // blacklist tokenOne
      await indexer.addToBlacklist(tokenOne, {
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
        250,
        await getTimestampPlusDays(1),
        aliceAddress,
        {
          from: aliceAddress,
        }
      )
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        await getTimestampPlusDays(1),
        bobAddress,
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

  describe('Test lengthOf', async () => {
    it("should return 0 if the market doesn't exist", async () => {
      // call length of without creating the market
      let result = await indexer.lengthOf.call(tokenOne, tokenTwo)
      equal(result, 0, 'result should be 0')
    })

    it('should return the length of the market', async () => {
      // create market
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // set two intents
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        await getTimestampPlusDays(1),
        aliceAddress,
        {
          from: aliceAddress,
        }
      )
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        await getTimestampPlusDays(1),
        bobAddress,
        {
          from: bobAddress,
        }
      )

      // now call length of
      let result = await indexer.lengthOf.call(tokenOne, tokenTwo)
      equal(result, 2, 'result should be 2')
    })
  })
})
