const BN = require('bignumber.js')

const Market = artifacts.require('Market')
const FungibleToken = artifacts.require('FungibleToken')

const { equal, passes } = require('@airswap/test-utils').assert
const {
  getTimestampPlusDays,
  advanceTimeAndBlock,
} = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')

const NULL_LOCATOR = '0x'.padEnd(66, '0')
const SECONDS_IN_DAY = 86400

const ALICE_LOC = intents.serialize(
  intents.Locators.INSTANT,
  '0x3768a06fefe82e7a20ad3a099ec4e908fba5fd04'
)
const BOB_LOC = intents.serialize(
  intents.Locators.CONTRACT,
  '0xbb58285762f0b56b6a206d6032fc6939eb26f4e8'
)
const CAROL_LOC = intents.serialize(
  intents.Locators.URL,
  'https://rpc.maker-cloud.io:80'
)
const DAVID_LOC = intents.serialize(
  intents.Locators.URL,
  'mailto://mosites@gmail.com'
)
const EVE_LOC = intents.serialize(
  intents.Locators.CONTRACT,
  '0xd0a7a17ef9116668a299476f6230791ae0c5c8ba'
)

const ZARA_LOC = intents.serialize(
  intents.Locators.CONTRACT,
  '0xa916a5830d21bc05c4c56ce5452cc96d8edd8f8c'
)

let market

contract(
  'Market',
  ([
    aliceAddress,
    bobAddress,
    carolAddress,
    davidAddress,
    eveAddress,
    fredAddress,
    zaraAddress,
  ]) => {
    describe('Deploying...', () => {
      it('Deployed trading token "AST"', async () => {
        tokenAST = await FungibleToken.new()
      })

      it('Deployed trading token "DAI"', async () => {
        tokenDAI = await FungibleToken.new()
      })

      it('Deployed market for AST/DAI', async () => {
        market = await Market.new(tokenAST.address, tokenDAI.address)
      })
    })

    describe('Set', () => {
      it('Sets an intent for Alice', async () => {
        await market.setIntent(
          aliceAddress,
          2000,
          await getTimestampPlusDays(3),
          ALICE_LOC
        )
      })

      it('Sets an intent for Bob', async () => {
        await market.setIntent(
          bobAddress,
          500,
          await getTimestampPlusDays(2),
          BOB_LOC
        )
      })

      it('Sets an intent for Carol', async () => {
        await market.setIntent(
          carolAddress,
          1500,
          await getTimestampPlusDays(1),
          CAROL_LOC
        )
      })

      it('Sets an intent for David', async () => {
        await market.setIntent(
          davidAddress,
          100,
          await getTimestampPlusDays(3),
          DAVID_LOC
        )
      })

      it('Sets an intent of 0 for zara', async () => {
        await market.setIntent(
          zaraAddress,
          0,
          await getTimestampPlusDays(4),
          ZARA_LOC
        )
      })

      it("Sets an intent for Eve equal to Bob's intent", async () => {
        await market.setIntent(
          eveAddress,
          500,
          await getTimestampPlusDays(2),
          EVE_LOC
        )
      })

      it('Ensure ordering is correct', async () => {
        const intents = await market.fetchIntents(7)
        assert(intents[0] == ALICE_LOC, 'Alice is not first')
        assert(intents[1] == CAROL_LOC, 'Carol should be second')
        assert(intents[2] == BOB_LOC, 'Bob should be third')
        assert(intents[3] == EVE_LOC, 'Eve should be fourth')
        assert(intents[4] == DAVID_LOC, 'David should be fifth')
        assert(intents[5] == ZARA_LOC, 'Zara should be last')
      })
    })

    describe('Get', () => {
      it('Gets the intent for Alice', async () => {
        equal((await market.getIntent(aliceAddress)).locator, ALICE_LOC)
      })

      it('Gets the intent for Bob', async () => {
        equal((await market.getIntent(bobAddress)).locator, BOB_LOC)
      })

      it('Gets the intent for Carol', async () => {
        equal((await market.getIntent(carolAddress)).locator, CAROL_LOC)
      })

      it('Gets the intent for David', async () => {
        equal((await market.getIntent(davidAddress)).locator, DAVID_LOC)
      })

      it('Gets the intent for Eve', async () => {
        equal((await market.getIntent(eveAddress)).locator, EVE_LOC)
      })

      it('Gets the intent for Zara', async () => {
        let zaraIntent = await market.getIntent(zaraAddress)
        equal(zaraIntent.locator, ZARA_LOC)
        equal(zaraIntent.amount, 0)
      })

      it('Gets a non existent intent', async () => {
        equal((await market.getIntent(fredAddress)).locator, NULL_LOCATOR)
      })
    })

    describe('Fetch', () => {
      it('Fetches intents', async () => {
        const intents = await market.fetchIntents(7)
        assert(intents[0] == ALICE_LOC, 'Alice is not first')
        assert(intents[1] == CAROL_LOC, 'Carol should be second')
        assert(intents[2] == BOB_LOC, 'Bob should be third')
        assert(intents[3] == EVE_LOC, 'Eve should be fourth')
        assert(intents[4] == DAVID_LOC, 'David should be fifth')
        assert(intents[5] == ZARA_LOC, 'Zara should be last')
        assert(BN(await market.length()).eq(6), 'Market length is incorrect')
      })

      it("Doesn't fetch an expired intent", async () => {
        // Advance time a day and a half.
        // This advances past the expiry of Carol's intent
        await advanceTimeAndBlock(SECONDS_IN_DAY * 1.5)
        const intents = await market.fetchIntents(7)
        assert(intents[0] == ALICE_LOC, 'Alice is not first')
        assert(intents[1] == BOB_LOC, 'Bob should be second')
        assert(intents[2] == EVE_LOC, 'Eve should be third')
        assert(intents[3] == DAVID_LOC, 'David should be fourth')
        assert(intents[4] == ZARA_LOC, 'Zara should be fifth')
        // Market length still includes carol's intent
        assert(BN(await market.length()).eq(6), 'Market length is incorrect')
      })

      it('If an intent has expired, the end of the returned list is 0x0', async () => {
        const intents = await market.fetchIntents(7)
        assert(BN(intents.length).eq(6), 'Returned intents wrong length')
        assert(
          intents[5] == NULL_LOCATOR,
          'Final slot should be 0x0 - carol=expired'
        )
      })
    })

    describe('Garbage Collection', () => {
      it("Doesn't remove any intents that haven't expired", async () => {
        let intents = await market.fetchIntents(7)
        // Returns all 6 intents
        assert(BN(intents.length).eq(6), 'Returned intents wrong length')

        // Tries to remove intents, looping from Bob, count 5
        // Bob -> Eve -> David -> Zara -> HEAD -> Alice (Carol is after Alice, before Bob)
        await market.cleanExpiredIntents(bobAddress, 5)

        intents = await market.fetchIntents(7)
        assert(BN(intents.length).eq(6), 'Intents should be same length')

        // Ensure that the ordering is the same
        assert(intents[0] == ALICE_LOC, 'Alice is not first')
        assert(intents[1] == BOB_LOC, 'Bob should be second')
        assert(intents[2] == EVE_LOC, 'Eve should be third')
        assert(intents[3] == DAVID_LOC, 'David should be fourth')
        assert(intents[4] == ZARA_LOC, 'Zara should be fifth')
        assert(intents[5] == NULL_LOCATOR, 'Null 6th location')
      })

      it("Should remove Carol's intent if she's included in the loop", async () => {
        let intents = await market.fetchIntents(7)
        // Returns all 6 intents
        assert(BN(intents.length).eq(6), 'Returned intents wrong length')
 
        // Try to remove Carol's intent (Zara -> HEAD -> Alice -> Carol -> Bob)
        let tx = await market.cleanExpiredIntents(zaraAddress, 4)
        passes(tx)

        // Returns just 5 intents this time - carol has been removed
        intents = await market.fetchIntents(7)
        assert(BN(intents.length).eq(5), 'Intents should be shorter')

        // Ensure that the ordering is the same, without a null 6th slot
        assert(intents[0] == ALICE_LOC, 'Alice is not first')
        assert(intents[1] == BOB_LOC, 'Bob should be second')
        assert(intents[2] == EVE_LOC, 'Eve should be third')
        assert(intents[3] == DAVID_LOC, 'David should be fourth')
        assert(intents[4] == ZARA_LOC, 'Zara should be fifth')
      })

      it('Remove more intents after more time', async () => {
        // Advance time another 0.6 days
        // This advances past the expiry of Bob's and Eve's intents
        await advanceTimeAndBlock(SECONDS_IN_DAY * 0.6)
        let intents = await market.fetchIntents(7)
        // Returns 5 intents as Bob and Eve have not been removed
        assert(BN(intents.length).eq(5), 'Returned intents wrong length')

        // Loop through, not including Bob and Eve
        await market.cleanExpiredIntents(davidAddress, 3)

        // no intents have been removed
        intents = await market.fetchIntents(7)
        assert(BN(intents.length).eq(5), 'Intents should be same length')

        // Now loop through, removing both in one go
        await market.cleanExpiredIntents(bobAddress, 2)

        intents = await market.fetchIntents(7)
        // Returns just 3 intents this time
        assert(BN(intents.length).eq(3), 'Intents should be shorter')

        // Ensure that the ordering is the same
        assert(intents[0] == ALICE_LOC, 'Alice is not first')
        assert(intents[1] == DAVID_LOC, 'David should be fourth')
        assert(intents[2] == ZARA_LOC, 'Zara should be fifth')
      })
    })

    describe('Unset', () => {
      it('Unsets intent for Bob', async () => {
        market.unsetIntent(davidAddress)
        equal((await market.getIntent(davidAddress)).locator, NULL_LOCATOR)
        assert(BN(await market.length()).eq(2), 'Market length is incorrect')
      })

      it('Unsets intent for Zara', async () => {
        market.unsetIntent(zaraAddress)
        equal((await market.getIntent(zaraAddress)).locator, NULL_LOCATOR)
        assert(BN(await market.length()).eq(1), 'Market length is incorrect')
      })

      it('Ensure ordering is correct', async () => {
        const intents = await market.fetchIntents(10)
        assert(intents[0] == ALICE_LOC, 'Alice is not first')

        assert(BN(await market.length()).eq(1), 'Market length is incorrect')
      })
    })
  }
)
