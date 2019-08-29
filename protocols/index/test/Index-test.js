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
    it('Sets an entry for Alice', async () => {
      await index.setEntry(aliceAddress, 2000, aliceAddress)
    })

    it('Sets an entry for Bob', async () => {
      await index.setEntry(bobAddress, 500, bobAddress)
    })

    it('Sets an entry for Carol', async () => {
      await index.setEntry(carolAddress, 1500, carolAddress)
    })

    it('Sets an entry for David', async () => {
      await index.setEntry(davidAddress, 100, davidAddress)
    })

    it('Sets an entry of 0 for zara', async () => {
      await index.setEntry(zaraAddress, 0, zaraAddress)
    })

    it("Sets an entry for Eve equal to Bob's entry", async () => {
      await index.setEntry(eveAddress, 500, eveAddress)
    })

    it('Ensure ordering is correct', async () => {
      const entries = await index.fetchEntries(7)
      assert(entries[0] == aliceLocator, 'Alice should be first')
      assert(entries[1] == carolLocator, 'Carol should be second')
      assert(entries[2] == bobLocator, 'Bob should be third')
      assert(entries[3] == eveLocator, 'Eve should be fourth')
      assert(entries[4] == davidLocator, 'David should be fifth')
      assert(entries[5] == zaraLocator, 'Zara should be last')
    })
  })

  describe('Get', async () => {
    it('Gets the entry for Alice', async () => {
      equal((await index.getEntry(aliceAddress)).locator, aliceLocator)
    })

    it('Gets the entry for Bob', async () => {
      equal((await index.getEntry(bobAddress)).locator, bobLocator)
    })

    it('Gets the entry for Carol', async () => {
      equal((await index.getEntry(carolAddress)).locator, carolLocator)
    })

    it('Gets the entry for David', async () => {
      equal((await index.getEntry(davidAddress)).locator, davidLocator)
    })

    it('Gets the entry for Eve', async () => {
      equal((await index.getEntry(eveAddress)).locator, eveLocator)
    })

    it('Gets the entry for Zara', async () => {
      let zaraEntry = await index.getEntry(zaraAddress)
      equal(zaraEntry.locator, zaraLocator)
      equal(zaraEntry.score, 0)
    })

    it('Gets a non existent entry', async () => {
      let fredEntry = await index.getEntry(fredAddress)
      equal(fredEntry.locator, emptyLocator)
    })
  })

  describe('Fetch', async () => {
    it('Fetches entries', async () => {
      const entries = await index.fetchEntries(7)
      assert(entries[0] == aliceLocator, 'Alice should be first')
      assert(entries[1] == carolLocator, 'Carol should be second')
      assert(entries[2] == bobLocator, 'Bob should be third')
      assert(entries[3] == eveLocator, 'Eve should be fourth')
      assert(entries[4] == davidLocator, 'David should be fifth')
      assert(entries[5] == zaraLocator, 'Zara should be last')
      assert(BN(await index.length()).eq(6), 'Index length is incorrect')
    })
  })
})
