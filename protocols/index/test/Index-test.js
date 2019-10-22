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
    it('Sets a locator for Alice', async () => {
      await index.setLocator(aliceAddress, 2000, aliceAddress)
    })

    it('Sets a locator for Bob', async () => {
      await index.setLocator(bobAddress, 500, bobAddress)
    })

    it('Sets a locator for Carol', async () => {
      await index.setLocator(carolAddress, 1500, carolAddress)
    })

    it('Sets a locator for David', async () => {
      await index.setLocator(davidAddress, 100, davidAddress)
    })

    it('Sets a locator of 0 for zara', async () => {
      await index.setLocator(zaraAddress, 0, zaraAddress)
    })

    it("Sets a locator for Eve equal to Bob's locator", async () => {
      await index.setLocator(eveAddress, 500, eveAddress)
    })

    it('Ensure ordering is correct', async () => {
      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      assert(locators[0] == aliceLocator, 'Alice should be first')
      assert(locators[1] == carolLocator, 'Carol should be second')
      assert(locators[2] == bobLocator, 'Bob should be third')
      assert(locators[3] == eveLocator, 'Eve should be fourth')
      assert(locators[4] == davidLocator, 'David should be fifth')
      assert(locators[5] == zaraLocator, 'Zara should be last')
    })
  })

  describe('Get', async () => {
    it('Gets the locator for Alice', async () => {
      equal((await index.getLocator(aliceAddress)).data, aliceLocator)
    })

    it('Gets the locator for Bob', async () => {
      equal((await index.getLocator(bobAddress)).data, bobLocator)
    })

    it('Gets the locator for Carol', async () => {
      equal((await index.getLocator(carolAddress)).data, carolLocator)
    })

    it('Gets the locator for David', async () => {
      equal((await index.getLocator(davidAddress)).data, davidLocator)
    })

    it('Gets the locator for Eve', async () => {
      equal((await index.getLocator(eveAddress)).data, eveLocator)
    })

    it('Gets the locator for Zara', async () => {
      let zaraLocator = await index.getLocator(zaraAddress)
      equal(zaraLocator.data, zaraLocator.data)
      equal(zaraLocator.score, 0)
    })

    it('Gets a non existent locator', async () => {
      let fredLocator = await index.getLocator(fredAddress)
      equal(fredLocator.data, emptyLocator)
    })
  })

  describe('Fetch', async () => {
    it('Fetches locators', async () => {
      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      assert(locators[0] == aliceLocator, 'Alice should be first')
      assert(locators[1] == carolLocator, 'Carol should be second')
      assert(locators[2] == bobLocator, 'Bob should be third')
      assert(locators[3] == eveLocator, 'Eve should be fourth')
      assert(locators[4] == davidLocator, 'David should be fifth')
      assert(locators[5] == zaraLocator, 'Zara should be last')
      assert(BN(await index.length()).eq(6), 'Index length is incorrect')
    })
  })
})
