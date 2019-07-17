const BN = require('bignumber.js')

const Market = artifacts.require('Market')
const FungibleToken = artifacts.require('FungibleToken')

const { equal } = require('@airswap/test-utils').assert
const { getExpiry } = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')

const NULL_LOCATOR = '0x'.padEnd(66, '0')

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
        await market.setIntent(aliceAddress, 2000, getExpiry(), ALICE_LOC)
      })

      it('Sets an intent for Bob', async () => {
        await market.setIntent(bobAddress, 500, getExpiry(), BOB_LOC)
      })

      it('Sets an intent for Carol', async () => {
        await market.setIntent(carolAddress, 1500, getExpiry(), CAROL_LOC)
      })

      it('Sets an intent for David', async () => {
        await market.setIntent(davidAddress, 100, getExpiry(), DAVID_LOC)
      })

      it('Sets an intent of 0 for zara', async () => {
        await market.setIntent(zaraAddress, 0, getExpiry(), ZARA_LOC)
        const intents = await market.fetchIntents(7)
      })

      it("Sets an intent for Eve equal to Bob's intent", async () => {
        await market.setIntent(eveAddress, 500, getExpiry(), EVE_LOC)
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

    describe('Unset', () => {
      it('Unsets intent for Bob', async () => {
        market.unsetIntent(bobAddress)
        equal((await market.getIntent(bobAddress)).locator, NULL_LOCATOR)
        assert(BN(await market.length()).eq(5))
      })

      it('Unsets intent for Zara', async () => {
        market.unsetIntent(zaraAddress)
        equal((await market.getIntent(zaraAddress)).locator, NULL_LOCATOR)
        assert(BN(await market.length()).eq(4))
      })

      it('Ensure ordering is correct', async () => {
        const intents = await market.fetchIntents(10)
        assert(intents[0] == ALICE_LOC, 'Alice is not first')
        assert(intents[1] == CAROL_LOC, 'Carol should be second')
        assert(intents[2] == EVE_LOC, 'Eve should be third')
        assert(intents[3] == DAVID_LOC, 'David should be fourth')
      })
    })
  }
)
