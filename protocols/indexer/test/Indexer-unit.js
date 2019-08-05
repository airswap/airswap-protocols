/* global artifacts, contract, web3 */
const Indexer = artifacts.require('Indexer')
const Market = artifacts.require('Market')
const MockContract = artifacts.require('MockContract')

const {
  getResult,
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
const { intents } = require('@airswap/indexer-utils')

const ALICE_LOC = intents.serialize(
  intents.Locators.URL,
  'https://rpc.maker-cloud.io:1123'
)

const BOB_LOC = intents.serialize(
  intents.Locators.CONTRACT,
  '0xbb58285762f0b56b6a206d6032fc6939eb26f4e8'
)

contract('Indexer Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[2]
  let bobAddress = accounts[3]

  const MIN_STAKE_250 = 250
  const MIN_STAKE_500 = 500

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
    indexer = await Indexer.new(stakingTokenAddress, MIN_STAKE_250)
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

    it('should set the staking minimum correctly', async () => {
      const actualMinimum = await indexer.stakeMinimum()
      equal(actualMinimum, MIN_STAKE_250, 'Staking minimum was set incorrectly')
    })

    it('should emit an event in the constructor', async () => {
      // create a new indexer
      const newIndexer = await Indexer.new(stakingTokenAddress, MIN_STAKE_250)

      // get the tx hash and get the transaction result from it
      let txHash = newIndexer.transactionHash
      let result = await getResult(newIndexer, txHash)

      emitted(result, 'SetStakeMinimum', event => {
        return event.amount.toNumber() === MIN_STAKE_250
      })
    })
  })

  describe('Test setStakeMinimum', async () => {
    it('should not allow a non-owner to change the minimum', async () => {
      await reverted(
        indexer.setStakeMinimum(MIN_STAKE_500, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to change the minimum', async () => {
      let result = await indexer.setStakeMinimum(MIN_STAKE_500, { from: owner })
      emitted(result, 'SetStakeMinimum', event => {
        return event.amount.toNumber() === MIN_STAKE_500
      })
    })
  })

  describe('Test createMarket and createTwoSidedMarket', async () => {
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

    it('createTwoSidedMarket should create 2 new markets if they dont exist', async () => {
      let result = await indexer.createTwoSidedMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // 2 events are emitted - one for each market
      emitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenOne && event.takerToken === tokenTwo
      })
      emitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenTwo && event.takerToken === tokenOne
      })

      // and 2 markets with the correct tokens have been created
      let markets = await indexer.createTwoSidedMarket.call(
        tokenOne,
        tokenTwo,
        {
          from: aliceAddress,
        }
      )

      await checkMarketAtAddress(markets[0], tokenOne, tokenTwo)
      await checkMarketAtAddress(markets[1], tokenTwo, tokenOne)
    })

    it('createTwoSidedMarket should just return 2 addresses if they exist', async () => {
      // create the 2 markets so they already exist
      await indexer.createTwoSidedMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now trying to create it again will not emit the event
      let result = await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      notEmitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenOne && event.takerToken === tokenTwo
      })
      notEmitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenTwo && event.takerToken === tokenOne
      })

      // instead the markets' addresses are returned
      let markets = await indexer.createTwoSidedMarket.call(
        tokenOne,
        tokenTwo,
        {
          from: aliceAddress,
        }
      )

      await checkMarketAtAddress(markets[0], tokenOne, tokenTwo)
      await checkMarketAtAddress(markets[1], tokenTwo, tokenOne)
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
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'MARKET_DOES_NOT_EXIST'
      )
    })

    it('should not set an intent if the minimim stake isnt met', async () => {
      // make the market first
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now try to stake with an amount less than 250
      await reverted(
        indexer.setIntent(
          tokenOne,
          tokenTwo,
          249,
          await getTimestampPlusDays(1),
          ALICE_LOC,
          {
            from: aliceAddress,
          }
        ),
        'MINIMUM_NOT_MET'
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
          ALICE_LOC,
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
          ALICE_LOC,
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
          ALICE_LOC,
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
        ALICE_LOC,
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
        ALICE_LOC,
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
          ALICE_LOC,
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
        ALICE_LOC,
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

  describe('Test setTwoSidedIntent', async () => {
    it('should not set either intent if 1 breaks a rule', async () => {
      // make one market
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      let expiry = await getTimestampPlusDays(1)

      // try to set both intents, but one market doesnt exist
      await reverted(
        indexer.setTwoSidedIntent(tokenOne, tokenTwo, 250, expiry, ALICE_LOC, {
          from: aliceAddress,
        }),
        'MARKET_DOES_NOT_EXIST'
      )

      // create the other market (both exist now)
      await indexer.createMarket(tokenTwo, tokenOne, {
        from: aliceAddress,
      })

      // alice stakes on one market
      await indexer.setIntent(tokenOne, tokenTwo, 250, expiry, ALICE_LOC, {
        from: aliceAddress,
      })

      // try to set both intents, but fails as alice has already staked on one
      await reverted(
        indexer.setTwoSidedIntent(tokenOne, tokenTwo, 250, expiry, ALICE_LOC, {
          from: aliceAddress,
        }),
        'USER_ALREADY_STAKED'
      )
    })

    it('should set 2 valid intents and emit 2 events', async () => {
      // make both markets
      await indexer.createTwoSidedMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      let expiry = await getTimestampPlusDays(1)

      // set the intents
      let result = await indexer.setTwoSidedIntent(
        tokenOne,
        tokenTwo,
        250,
        expiry,
        ALICE_LOC,
        {
          from: aliceAddress,
        }
      )
      passes(result)

      // check both events were emitted
      emitted(result, 'Stake', event => {
        return (
          event.wallet === aliceAddress &&
          event.makerToken === tokenOne &&
          event.takerToken == tokenTwo &&
          event.amount.toNumber() === 250 &&
          event.expiry.toNumber() === expiry
        )
      })

      emitted(result, 'Stake', event => {
        return (
          event.wallet === aliceAddress &&
          event.makerToken === tokenTwo &&
          event.takerToken == tokenOne &&
          event.amount.toNumber() === 250 &&
          event.expiry.toNumber() === expiry
        )
      })
    })
  })

  describe('Test unsetTwoSidedIntent', async () => {
    it('should not unset either intent if 1 breaks a rule', async () => {
      // make one market and one intent
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })
      let expiry = await getTimestampPlusDays(1)
      await indexer.setIntent(tokenOne, tokenTwo, 250, expiry, ALICE_LOC, {
        from: aliceAddress,
      })

      // try to unset both intents, but the second market doesnt exist
      await reverted(
        indexer.unsetTwoSidedIntent(tokenOne, tokenTwo, {
          from: aliceAddress,
        }),
        'MARKET_DOES_NOT_EXIST'
      )

      // create the other market (both exist now), and stake on it
      await indexer.createMarket(tokenTwo, tokenOne, {
        from: aliceAddress,
      })
      await indexer.setIntent(tokenTwo, tokenOne, 250, expiry, ALICE_LOC, {
        from: aliceAddress,
      })

      // unset intent from first market
      await indexer.unsetIntent(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // try to unset both intents, but fails as alice has only staked on one
      await reverted(
        indexer.unsetTwoSidedIntent(tokenOne, tokenTwo, {
          from: aliceAddress,
        }),
        'INTENT_DOES_NOT_EXIST'
      )
    })

    it('should unset 2 valid intents and emit 2 events', async () => {
      // make both markets
      await indexer.createTwoSidedMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      let expiry = await getTimestampPlusDays(1)

      // set both intents
      await indexer.setTwoSidedIntent(
        tokenOne,
        tokenTwo,
        250,
        expiry,
        ALICE_LOC,
        {
          from: aliceAddress,
        }
      )

      // now unset 2 intents
      let result = await indexer.unsetTwoSidedIntent(tokenOne, tokenTwo, {
        from: aliceAddress,
      })
      passes(result)

      // check both events were emitted
      emitted(result, 'Unstake', event => {
        return (
          event.wallet === aliceAddress &&
          event.makerToken === tokenOne &&
          event.takerToken == tokenTwo &&
          event.amount.toNumber() === 250
        )
      })

      emitted(result, 'Unstake', event => {
        return (
          event.wallet === aliceAddress &&
          event.makerToken === tokenTwo &&
          event.takerToken == tokenOne &&
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
        ALICE_LOC,
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
        ALICE_LOC,
        {
          from: aliceAddress,
        }
      )
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        await getTimestampPlusDays(1),
        BOB_LOC,
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
        ALICE_LOC,
        {
          from: aliceAddress,
        }
      )
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        await getTimestampPlusDays(1),
        BOB_LOC,
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
