const BN = require('bignumber.js')

const Market = artifacts.require('Market')
const FungibleToken = artifacts.require('FungibleToken')

const { equal } = require('@airswap/test-utils').assert
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

const defaultIntentExpiry = Math.round((new Date().getTime() + 60000) / 1000)

let market

contract(
  'Market',
  ([aliceAddress, bobAddress, carolAddress, davidAddress, eveAddress]) => {
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
        await market.set(aliceAddress, 250, defaultIntentExpiry, ALICE_LOC)
      })

      it('Sets an intent for Bob', async () => {
        await market.set(bobAddress, 500, defaultIntentExpiry, BOB_LOC)
      })

      it('Sets an intent for Carol', async () => {
        await market.set(carolAddress, 2000, defaultIntentExpiry, CAROL_LOC)
      })

      it('Sets an intent for David', async () => {
        await market.set(davidAddress, 1000, defaultIntentExpiry, DAVID_LOC)
      })

      it('Ensure ordering is correct', async () => {
        const intents = await market.fetch(4)
        assert(intents[0] == CAROL_LOC, 'Carol is not first')
        assert(intents[1] == DAVID_LOC, 'David should be second')
        assert(intents[2] == BOB_LOC, 'Bob should be third')
        assert(intents[3] == ALICE_LOC, 'Alice should be fourth')
      })
    })

    describe('Get', () => {
      it('Gets the intent for Alice', async () => {
        equal((await market.get(aliceAddress)).locator, ALICE_LOC)
      })

      it('Gets the intent for Bob', async () => {
        equal((await market.get(bobAddress)).locator, BOB_LOC)
      })

      it('Gets the intent for Carol', async () => {
        equal((await market.get(carolAddress)).locator, CAROL_LOC)
      })

      it('Gets the intent for David', async () => {
        equal((await market.get(davidAddress)).locator, DAVID_LOC)
      })

      it('Gets a non existent intent', async () => {
        equal((await market.get(eveAddress)).locator, NULL_LOCATOR)
      })
    })

    describe('Unset', () => {
      it('Unsets intent for David', async () => {
        market.unset(davidAddress)
        equal((await market.get(davidAddress)).locator, NULL_LOCATOR)
        assert(BN(await market.length()).eq(3))
      })

      it('Ensure ordering is correct', async () => {
        const intents = await market.fetch(10)
        assert(intents[0] == CAROL_LOC, 'Carol is not first')
        assert(intents[1] == BOB_LOC, 'Bob should be second')
        assert(intents[2] == ALICE_LOC, 'Alice should be third')
      })
    })
  }
)
