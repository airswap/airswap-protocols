const assert = require('assert')
const BN = require('bignumber.js')

const Market = artifacts.require('Market')
const FungibleToken = artifacts.require('FungibleToken')

const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { equal } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
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
      await market.setIntent(aliceAddress, 2000, aliceAddress)
    })

    it('Sets an intent for Bob', async () => {
      await market.setIntent(bobAddress, 500, bobAddress)
    })

    it('Sets an intent for Carol', async () => {
      await market.setIntent(carolAddress, 1500, carolAddress)
    })

    it('Sets an intent for David', async () => {
      await market.setIntent(davidAddress, 100, davidAddress)
    })

    it('Sets an intent of 0 for zara', async () => {
      await market.setIntent(zaraAddress, 0, zaraAddress)
    })

    it("Sets an intent for Eve equal to Bob's intent", async () => {
      await market.setIntent(eveAddress, 500, eveAddress)
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
  })
})
