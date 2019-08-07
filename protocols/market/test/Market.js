const assert = require('assert')
const BN = require('bignumber.js')

const Market = artifacts.require('Market')
const FungibleToken = artifacts.require('FungibleToken')

const {
  SECONDS_IN_DAY,
  EMPTY_ADDRESS,
} = require('@airswap/order-utils').constants
const { equal, passes } = require('@airswap/test-utils').assert
const {
  getTimestampPlusDays,
  advanceTimeAndBlock,
  takeSnapshot,
  revertToSnapShot,
} = require('@airswap/test-utils').time

let market

let snapshotId

contract('Market', async accounts => {
  let aliceAddress = accounts[0]
  let bobAddress = accounts[1]
  let carolAddress = accounts[2]
  let davidAddress = accounts[3]
  let eveAddress = accounts[4]
  let fredAddress = accounts[5]
  let zaraAddress = accounts[6]

  before('Setup', async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  after(async () => {
    await revertToSnapShot(snapshotId)
  })

  describe('Deploying...', async () => {
    it('Deployed trading token "AST" and "DAI" and market for AST/DAI', async () => {
      let tokenAST = await FungibleToken.new()
      let tokenDAI = await FungibleToken.new()
      market = await Market.new(tokenAST.address, tokenDAI.address)
    })
  })

  describe('Set', async () => {
    it('Sets an intent for Alice', async () => {
      await market.setIntent(
        aliceAddress,
        2000,
        await getTimestampPlusDays(3),
        aliceAddress
      )
    })

    it('Sets an intent for Bob', async () => {
      await market.setIntent(
        bobAddress,
        500,
        await getTimestampPlusDays(2),
        bobAddress
      )
    })

    it('Sets an intent for Carol', async () => {
      await market.setIntent(
        carolAddress,
        1500,
        await getTimestampPlusDays(1),
        carolAddress
      )
    })

    it('Sets an intent for David', async () => {
      await market.setIntent(
        davidAddress,
        100,
        await getTimestampPlusDays(3),
        davidAddress
      )
    })

    it('Sets an intent of 0 for zara', async () => {
      await market.setIntent(
        zaraAddress,
        0,
        await getTimestampPlusDays(4),
        zaraAddress
      )
    })

    it("Sets an intent for Eve equal to Bob's intent", async () => {
      await market.setIntent(
        eveAddress,
        500,
        await getTimestampPlusDays(2),
        eveAddress
      )
    })

    it('Ensure ordering is correct', async () => {
      const intents = await market.fetchIntents(7)
      assert(intents[0] == aliceAddress, 'Alice should be first')
      assert(intents[1] == carolAddress, 'Carol should be second')
      assert(intents[2] == bobAddress, 'Bob should be third')
      assert(intents[3] == eveAddress, 'Eve should be fourth')
      assert(intents[4] == davidAddress, 'David should be fifth')
      assert(intents[5] == zaraAddress, 'Zara should be last')
    })
  })

  describe('Get', async () => {
    it('Gets the intent for Alice', async () => {
      equal((await market.getIntent(aliceAddress)).locator, aliceAddress)
    })

    it('Gets the intent for Bob', async () => {
      equal((await market.getIntent(bobAddress)).locator, bobAddress)
    })

    it('Gets the intent for Carol', async () => {
      equal((await market.getIntent(carolAddress)).locator, carolAddress)
    })

    it('Gets the intent for David', async () => {
      equal((await market.getIntent(davidAddress)).locator, davidAddress)
    })

    it('Gets the intent for Eve', async () => {
      equal((await market.getIntent(eveAddress)).locator, eveAddress)
    })

    it('Gets the intent for Zara', async () => {
      let zaraIntent = await market.getIntent(zaraAddress)
      equal(zaraIntent.locator, zaraAddress)
      equal(zaraIntent.amount, 0)
    })

    it('Gets a non existent intent', async () => {
      equal((await market.getIntent(fredAddress)).locator, EMPTY_ADDRESS)
    })
  })

  describe('Fetch', async () => {
    it('Fetches intents', async () => {
      const intents = await market.fetchIntents(7)
      assert(intents[0] == aliceAddress, 'Alice should be first')
      assert(intents[1] == carolAddress, 'Carol should be second')
      assert(intents[2] == bobAddress, 'Bob should be third')
      assert(intents[3] == eveAddress, 'Eve should be fourth')
      assert(intents[4] == davidAddress, 'David should be fifth')
      assert(intents[5] == zaraAddress, 'Zara should be last')
      assert(BN(await market.length()).eq(6), 'Market length is incorrect')
    })

    it("Doesn't fetch an expired intent", async () => {
      // Advance time a day and a half.
      // This advances past the expiry of Carol's intent
      await advanceTimeAndBlock(SECONDS_IN_DAY * 1.5)
      const intents = await market.fetchIntents(7)
      assert(intents[0] == aliceAddress, 'Alice should be first')
      assert(intents[1] == bobAddress, 'Bob should be second')
      assert(intents[2] == eveAddress, 'Eve should be third')
      assert(intents[3] == davidAddress, 'David should be fourth')
      assert(intents[4] == zaraAddress, 'Zara should be fifth')
      // Market length still includes carol's intent
      assert(BN(await market.length()).eq(6), 'Market length is incorrect')
    })

    it('If an intent has expired, the end of the returned list is 0x0', async () => {
      const intents = await market.fetchIntents(7)
      assert(BN(intents.length).eq(6), 'Returned intents wrong length')
      assert(
        intents[5] == EMPTY_ADDRESS,
        'Final slot should be 0x0 - carol=expired'
      )
    })
  })

  describe('Garbage Collection', async () => {
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
      assert(intents[0] == aliceAddress, 'Alice should be first')
      assert(intents[1] == bobAddress, 'Bob should be second')
      assert(intents[2] == eveAddress, 'Eve should be third')
      assert(intents[3] == davidAddress, 'David should be fourth')
      assert(intents[4] == zaraAddress, 'Zara should be fifth')
      assert(intents[5] == EMPTY_ADDRESS, 'Null 6th location')
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
      assert(intents[0] == aliceAddress, 'Alice should be first')
      assert(intents[1] == bobAddress, 'Bob should be second')
      assert(intents[2] == eveAddress, 'Eve should be third')
      assert(intents[3] == davidAddress, 'David should be fourth')
      assert(intents[4] == zaraAddress, 'Zara should be fifth')
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
      assert(intents[0] == aliceAddress, 'Alice should be first')
      assert(intents[1] == davidAddress, 'David should be fourth')
      assert(intents[2] == zaraAddress, 'Zara should be fifth')
    })
  })
})
