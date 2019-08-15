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
const { padAddressToLocator } = require('@airswap/test-utils').padding

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

  let aliceLocator = padAddressToLocator(aliceAddress)
  let bobLocator = padAddressToLocator(bobAddress)
  let carolLocator = padAddressToLocator(carolAddress)
  let davidLocator = padAddressToLocator(davidAddress)
  let eveLocator = padAddressToLocator(eveAddress)
  let zaraLocator = padAddressToLocator(zaraAddress)
  let emptyLocator = padAddressToLocator(EMPTY_ADDRESS)

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
      assert(intents[0] == aliceLocator, 'Alice should be first')
      assert(intents[1] == carolLocator, 'Carol should be second')
      assert(intents[2] == bobLocator, 'Bob should be third')
      assert(intents[3] == eveLocator, 'Eve should be fourth')
      assert(intents[4] == davidLocator, 'David should be fifth')
      assert(intents[5] == zaraLocator, 'Zara should be last')
    })
  })

  describe('Get', async () => {
    it('Gets the intent for Alice', async () => {
      equal((await market.getIntent(aliceAddress)).locator, aliceLocator)
    })

    it('Gets the intent for Bob', async () => {
      equal((await market.getIntent(bobAddress)).locator, bobLocator)
    })

    it('Gets the intent for Carol', async () => {
      equal((await market.getIntent(carolAddress)).locator, carolLocator)
    })

    it('Gets the intent for David', async () => {
      equal((await market.getIntent(davidAddress)).locator, davidLocator)
    })

    it('Gets the intent for Eve', async () => {
      equal((await market.getIntent(eveAddress)).locator, eveLocator)
    })

    it('Gets the intent for Zara', async () => {
      let zaraIntent = await market.getIntent(zaraAddress)
      equal(zaraIntent.locator, zaraLocator)
      equal(zaraIntent.amount, 0)
    })

    it('Gets a non existent intent', async () => {
      let fredIntent = await market.getIntent(fredAddress)
      equal(fredIntent.locator, emptyLocator)
    })
  })

  describe('Fetch', async () => {
    it('Fetches intents', async () => {
      const intents = await market.fetchIntents(7)
      assert(intents[0] == aliceLocator, 'Alice should be first')
      assert(intents[1] == carolLocator, 'Carol should be second')
      assert(intents[2] == bobLocator, 'Bob should be third')
      assert(intents[3] == eveLocator, 'Eve should be fourth')
      assert(intents[4] == davidLocator, 'David should be fifth')
      assert(intents[5] == zaraLocator, 'Zara should be last')
      assert(BN(await market.length()).eq(6), 'Market length is incorrect')
    })

    it("Doesn't fetch an expired intent", async () => {
      // Advance time a day and a half.
      // This advances past the expiry of Carol's intent
      await advanceTimeAndBlock(SECONDS_IN_DAY * 1.5)
      const intents = await market.fetchIntents(7)
      assert(intents[0] == aliceLocator, 'Alice should be first')
      assert(intents[1] == bobLocator, 'Bob should be second')
      assert(intents[2] == eveLocator, 'Eve should be third')
      assert(intents[3] == davidLocator, 'David should be fourth')
      assert(intents[4] == zaraLocator, 'Zara should be fifth')
      // Market length still includes carol's intent
      assert(BN(await market.length()).eq(6), 'Market length is incorrect')
    })

    it('If an intent has expired, the end of the returned list is 0x0', async () => {
      const intents = await market.fetchIntents(7)
      assert(BN(intents.length).eq(6), 'Returned intents wrong length')
      assert(
        intents[5] == emptyLocator,
        'Final slot should be 0x0 - carol=expired'
      )
    })
  })

  describe('Garbage Collection', async () => {
    it("Doesn't return any intents that haven't expired", async () => {
      let intents = await market.fetchIntents(7)
      // Returns all 6 intents
      assert(BN(intents.length).eq(6), 'Returned intents wrong length')

      // Tries to remove intents, looping from Bob, count 5
      // Bob -> Eve -> David -> Zara -> HEAD -> Alice (Carol is after Alice, before Bob)
      let expiredIntents = await market.findExpiredIntents.call(bobAddress, 5)

      assert(BN(expiredIntents.length).eq(5), 'Array length should be 5')

      assert(expiredIntents[0] == EMPTY_ADDRESS, 'This element should be empty')
      assert(expiredIntents[1] == EMPTY_ADDRESS, 'This element should be empty')
      assert(expiredIntents[2] == EMPTY_ADDRESS, 'This element should be empty')
      assert(expiredIntents[3] == EMPTY_ADDRESS, 'This element should be empty')
      assert(expiredIntents[4] == EMPTY_ADDRESS, 'This element should be empty')
    })

    it("Should return Carol's intent if she's included in the loop", async () => {
      let intents = await market.fetchIntents(7)
      // Returns all 6 intents
      assert(BN(intents.length).eq(6), 'Returned intents wrong length')

      // Try to remove Carol's intent (Zara -> HEAD -> Alice -> Carol -> Bob)
      let expiredIntents = await market.findExpiredIntents.call(zaraAddress, 4)

      assert(BN(expiredIntents.length).eq(4), 'Array length should be 4')

      assert(expiredIntents[0] == carolAddress, 'Carol should be listed')
      assert(expiredIntents[1] == EMPTY_ADDRESS, 'This element should be empty')
      assert(expiredIntents[2] == EMPTY_ADDRESS, 'This element should be empty')
      assert(expiredIntents[3] == EMPTY_ADDRESS, 'This element should be empty')
    })

    it('Remove more intents after more time', async () => {
      // Advance time another 0.6 days
      // This advances past the expiry of Bob's and Eve's intents
      await advanceTimeAndBlock(SECONDS_IN_DAY * 0.6)

      // Now loop through, both Bob and Eve should be returned
      let expiredIntents = await market.findExpiredIntents.call(bobAddress, 2)

      assert(BN(expiredIntents.length).eq(2), 'Array length should be 2')

      assert(expiredIntents[0] == bobAddress, 'Bob should be listed')
      assert(expiredIntents[1] == eveAddress, 'Eve should be listed')
    })
  })
})
