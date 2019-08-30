const assert = require('assert')
const BN = require('bignumber.js')

const Index = artifacts.require('Index')

const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { equal } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { padAddressToLocator } = require('@airswap/test-utils').padding

let index

let snapshotId

contract('Index', async accounts => {
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
    it('Deployed new Index', async () => {
      index = await Index.new()
    })
  })

  describe('Set', async () => {
    it('Sets a signal for Alice', async () => {
      await index.setSignal(aliceAddress, 2000, aliceAddress)
    })

    it('Sets a signal for Bob', async () => {
      await index.setSignal(bobAddress, 500, bobAddress)
    })

    it('Sets a signal for Carol', async () => {
      await index.setSignal(carolAddress, 1500, carolAddress)
    })

    it('Sets a signal for David', async () => {
      await index.setSignal(davidAddress, 100, davidAddress)
    })

    it('Sets a signal of 0 for zara', async () => {
      await index.setSignal(zaraAddress, 0, zaraAddress)
    })

    it("Sets a signal for Eve equal to Bob's signal", async () => {
      await index.setSignal(eveAddress, 500, eveAddress)
    })

    it('Ensure ordering is correct', async () => {
      const signals = await index.fetchSignals(7)
      assert(signals[0] == aliceLocator, 'Alice should be first')
      assert(signals[1] == carolLocator, 'Carol should be second')
      assert(signals[2] == bobLocator, 'Bob should be third')
      assert(signals[3] == eveLocator, 'Eve should be fourth')
      assert(signals[4] == davidLocator, 'David should be fifth')
      assert(signals[5] == zaraLocator, 'Zara should be last')
    })
  })

  describe('Get', async () => {
    it('Gets the signal for Alice', async () => {
      equal((await index.getSignal(aliceAddress)).locator, aliceLocator)
    })

    it('Gets the signal for Bob', async () => {
      equal((await index.getSignal(bobAddress)).locator, bobLocator)
    })

    it('Gets the signal for Carol', async () => {
      equal((await index.getSignal(carolAddress)).locator, carolLocator)
    })

    it('Gets the signal for David', async () => {
      equal((await index.getSignal(davidAddress)).locator, davidLocator)
    })

    it('Gets the signal for Eve', async () => {
      equal((await index.getSignal(eveAddress)).locator, eveLocator)
    })

    it('Gets the signal for Zara', async () => {
      let zaraSignal = await index.getSignal(zaraAddress)
      equal(zaraSignal.locator, zaraLocator)
      equal(zaraSignal.score, 0)
    })

    it('Gets a non existent signal', async () => {
      let fredSignal = await index.getSignal(fredAddress)
      equal(fredSignal.locator, emptyLocator)
    })
  })

  describe('Fetch', async () => {
    it('Fetches signals', async () => {
      const signals = await index.fetchSignals(7)
      assert(signals[0] == aliceLocator, 'Alice should be first')
      assert(signals[1] == carolLocator, 'Carol should be second')
      assert(signals[2] == bobLocator, 'Bob should be third')
      assert(signals[3] == eveLocator, 'Eve should be fourth')
      assert(signals[4] == davidLocator, 'David should be fifth')
      assert(signals[5] == zaraLocator, 'Zara should be last')
      assert(BN(await index.length()).eq(6), 'Index length is incorrect')
    })
  })
})
