const BN = require('bignumber.js')

const Market = artifacts.require('Market')
const FungibleToken = artifacts.require('FungibleToken')

const { equal } = require('@airswap/test-utils').assert
const {
  getLatestTimestamp,
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
        let currentTime = await getLatestTimestamp()
        await market.setIntent(
          aliceAddress,
          2000,
          currentTime + SECONDS_IN_DAY * 3,
          ALICE_LOC
        )
      })

      it('Sets an intent for Bob', async () => {
        let currentTime = await getLatestTimestamp()
        await market.setIntent(
          bobAddress,
          500,
          currentTime + SECONDS_IN_DAY * 2,
          BOB_LOC
        )
      })

      it('Sets an intent for Carol', async () => {
        let currentTime = await getLatestTimestamp()
        await market.setIntent(
          carolAddress,
          1500,
          currentTime + SECONDS_IN_DAY * 1,
          CAROL_LOC
        )
      })

      it('Sets an intent for David', async () => {
        let currentTime = await getLatestTimestamp()
        await market.setIntent(
          davidAddress,
          100,
          currentTime + SECONDS_IN_DAY * 3,
          DAVID_LOC
        )
      })

      it('Sets an intent of 0 for zara', async () => {
        let currentTime = await getLatestTimestamp()
        await market.setIntent(
          zaraAddress,
          0,
          currentTime + SECONDS_IN_DAY * 4,
          ZARA_LOC
        )
      })

      it("Sets an intent for Eve equal to Bob's intent", async () => {
        let currentTime = await getLatestTimestamp()
        await market.setIntent(
          eveAddress,
          500,
          currentTime + SECONDS_IN_DAY * 2,
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

    describe('Unset', () => {
      it('Unsets intent for Bob', async () => {
        market.unsetIntent(bobAddress)
        equal((await market.getIntent(bobAddress)).locator, NULL_LOCATOR)
        assert(BN(await market.length()).eq(5), 'Market length is incorrect')
      })

      it('Unsets intent for Zara', async () => {
        market.unsetIntent(zaraAddress)
        equal((await market.getIntent(zaraAddress)).locator, NULL_LOCATOR)
        assert(BN(await market.length()).eq(4), 'Market length is incorrect')
      })

      it('Ensure ordering is correct', async () => {
        const intents = await market.fetchIntents(10)
        assert(intents[0] == ALICE_LOC, 'Alice is not first')
        assert(intents[1] == EVE_LOC, 'Eve should be second')
        assert(intents[2] == DAVID_LOC, 'David should be third')
        assert(
          intents[3] == NULL_LOCATOR,
          'Final slot should be 0x0 - carol=expired'
        )

        assert(BN(await market.length()).eq(4), 'Market length is incorrect')
      })
    })
  }
)
