const Index = artifacts.require('Index')

const {
  passes,
  equal,
  reverted,
  emitted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { padAddressToLocator } = require('@airswap/test-utils').padding
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

contract('Index Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[1]
  let bobAddress = accounts[2]
  let carolAddress = accounts[3]
  let davidAddress = accounts[4]

  let snapshotId
  let index

  let aliceLocator = padAddressToLocator(aliceAddress)
  let bobLocator = padAddressToLocator(bobAddress)
  let carolLocator = padAddressToLocator(carolAddress)
  let emptyLocator = padAddressToLocator(EMPTY_ADDRESS)

  // linked list helpers
  const LIST_HEAD = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'
  const LIST_PREV = '0x00'
  const LIST_NEXT = '0x01'
  const USER = 'user'
  const SCORE = 'score'
  const LOCATOR = 'locator'

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Setup', async () => {
    index = await Index.new({ from: owner })
  })

  async function checkLinking(prevUser, user, nextUser) {
    let actualNextUser = (await index.entriesLinkedList(user, LIST_NEXT))[USER]
    let actualPrevUser = (await index.entriesLinkedList(user, LIST_PREV))[USER]
    equal(actualNextUser, nextUser, 'Next user not set correctly')
    equal(actualPrevUser, prevUser, 'Prev user not set correctly')
  }

  describe('Test constructor', async () => {
    it('should setup the linked list as just a head, length 0', async () => {
      await checkLinking(LIST_HEAD, LIST_HEAD, LIST_HEAD)

      let listLength = await index.length()
      equal(listLength, 0, 'Link list length should be 0')
    })
  })

  describe('Test setEntry', async () => {
    it('should not allow a non owner to call setEntry', async () => {
      await reverted(
        index.setEntry(aliceAddress, 2000, aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow an entry to be inserted by the owner', async () => {
      // set an entry from the owner
      let result = await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // check the SetEntry event was emitted
      emitted(result, 'SetEntry', event => {
        return (
          event.user === aliceAddress &&
          event.score.toNumber() === 2000 &&
          event.locator === aliceLocator
        )
      })

      // check it has been inserted into the linked list correctly

      // check its been linked to the head correctly
      await checkLinking(aliceAddress, LIST_HEAD, aliceAddress)
      await checkLinking(LIST_HEAD, aliceAddress, LIST_HEAD)

      // check the values have been stored correctly
      let headNext = await index.entriesLinkedList(LIST_HEAD, LIST_NEXT)

      equal(headNext[USER], aliceAddress, 'Entry address not correct')
      equal(headNext[SCORE], 2000, 'Entry score not correct')
      equal(headNext[LOCATOR], aliceLocator, 'Entry locator not correct')

      // check the length has increased
      let listLength = await index.length()
      equal(listLength, 1, 'Link list length should be 1')
    })

    it('should insert subsequent entries in the correct order', async () => {
      // insert alice
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // now add more
      let result = await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })

      // check the SetEntry event was emitted
      emitted(result, 'SetEntry', event => {
        return (
          event.user === bobAddress &&
          event.score.toNumber() === 500 &&
          event.locator === bobLocator
        )
      })

      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      await checkLinking(LIST_HEAD, aliceAddress, carolAddress)
      await checkLinking(aliceAddress, carolAddress, bobAddress)
      await checkLinking(carolAddress, bobAddress, LIST_HEAD)

      let listLength = await index.length()
      equal(listLength, 3, 'Link list length should be 3')

      const entries = await index.fetchEntries(7)
      equal(entries[0], aliceLocator, 'Alice should be first')
      equal(entries[1], carolLocator, 'Carol should be second')
      equal(entries[2], bobLocator, 'Bob should be third')
    })

    it('should not be able to set a second entry if one already exists for an address', async () => {
      let trx = index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await passes(trx)
      trx = index.setEntry(aliceAddress, 5000, aliceLocator, {
        from: owner,
      })
      await reverted(trx, 'USER_HAS_ENTRY')

      let length = await index.length.call()
      equal(length.toNumber(), 1, 'length increased, but total users has not')
    })
  })

  describe('Test unsetEntry', async () => {
    beforeEach('Setup entries', async () => {
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })
    })

    it('should not allow a non owner to call unsetEntry', async () => {
      await reverted(
        index.unsetEntry(aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should leave state unchanged for someone who hasnt staked', async () => {
      let returnValue = await index.unsetEntry.call(davidAddress, {
        from: owner,
      })
      equal(returnValue, false, 'unsetEntry should have returned false')

      await index.unsetEntry(davidAddress, { from: owner })

      let listLength = await index.length()
      equal(listLength, 3, 'Link list length should be 3')

      const entries = await index.fetchEntries(7)
      equal(entries[0], aliceLocator, 'Alice should be first')
      equal(entries[1], carolLocator, 'Carol should be second')
      equal(entries[2], bobLocator, 'Bob should be third')
    })

    it('should unset the entry for a valid user', async () => {
      // check it returns true
      let returnValue = await index.unsetEntry.call(bobAddress, {
        from: owner,
      })
      equal(returnValue, true, 'unsetEntry should have returned true')

      // check it emits an event correctly
      let result = await index.unsetEntry(bobAddress, { from: owner })
      emitted(result, 'UnsetEntry', event => {
        return event.user === bobAddress
      })

      // check the linked list of entries is updated correspondingly
      await checkLinking(LIST_HEAD, aliceAddress, carolAddress)
      await checkLinking(aliceAddress, carolAddress, LIST_HEAD)

      let listLength = await index.length()
      equal(listLength, 2, 'Link list length should be 2')

      const entries = await index.fetchEntries(7)
      equal(entries[0], aliceLocator, 'Alice should be first')
      equal(entries[1], carolLocator, 'Carol should be second')

      await index.unsetEntry(aliceAddress, { from: owner })
      await index.unsetEntry(carolAddress, { from: owner })

      await checkLinking(LIST_HEAD, LIST_HEAD, LIST_HEAD)
      listLength = await index.length()
      equal(listLength, 0, 'Link list length should be 0')
    })

    it('unsetting entry twice in a row for an address has no effect', async () => {
      let trx = index.unsetEntry(bobAddress, { from: owner })
      await passes(trx)
      let size = await index.length.call()
      equal(size, 2, 'Entry was improperly removed')
      trx = index.unsetEntry(bobAddress, { from: owner })
      await passes(trx)
      equal(size, 2, 'Entry was improperly removed')

      let entries = await index.fetchEntries(7)
      equal(entries[0], aliceLocator, 'Alice should be first')
      equal(entries[1], carolLocator, 'Carol should be second')
    })
  })

  describe('Test getEntry', async () => {
    beforeEach('Setup entries again', async () => {
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })
    })

    it('should return empty entry for a non-user', async () => {
      let davidEntry = await index.getEntry(davidAddress)
      equal(davidEntry[USER], EMPTY_ADDRESS, 'David: Entry address not correct')
      equal(davidEntry[SCORE], 0, 'David: Entry score not correct')
      equal(
        davidEntry[LOCATOR],
        emptyLocator,
        'David: Entry locator not correct'
      )

      // now for a recently unset entry
      await index.unsetEntry(carolAddress, { from: owner })
      let carolEntry = await index.getEntry(carolAddress)
      equal(carolEntry[USER], EMPTY_ADDRESS, 'Carol: Entry address not correct')
      equal(carolEntry[SCORE], 0, 'Carol: Entry score not correct')
      equal(
        carolEntry[LOCATOR],
        emptyLocator,
        'Carol: Entry locator not correct'
      )
    })

    it('should return the correct entry for a valid user', async () => {
      let aliceEntry = await index.getEntry(aliceAddress)
      equal(aliceEntry[USER], aliceAddress, 'Alice: Entry address not correct')
      equal(aliceEntry[SCORE], 2000, 'Alice: Entry score not correct')
      equal(
        aliceEntry[LOCATOR],
        aliceLocator,
        'Alice: Entry locator not correct'
      )

      let bobEntry = await index.getEntry(bobAddress)
      equal(bobEntry[USER], bobAddress, 'Bob: entry address not correct')
      equal(bobEntry[SCORE], 500, 'Bob: Entry score not correct')
      equal(bobEntry[LOCATOR], bobLocator, 'Bob: Entry locator not correct')
    })
  })

  describe('Test fetchEntries', async () => {
    it('returns an empty array with no entries', async () => {
      const entries = await index.fetchEntries(7)
      equal(entries.length, 0, 'there should be no entries')
    })

    it('returns specified number of elements if < length', async () => {
      // add 3 entries
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const entries = await index.fetchEntries(2)
      equal(entries.length, 2, 'there should only be 2 entries returned')

      equal(entries[0], aliceLocator, 'Alice should be first')
      equal(entries[1], carolLocator, 'Carol should be second')
    })

    it('returns only length if requested number if larger', async () => {
      // add 3 entries
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const entries = await index.fetchEntries(10)
      equal(entries.length, 3, 'there should only be 3 entries returned')

      equal(entries[0], aliceLocator, 'Alice should be first')
      equal(entries[1], carolLocator, 'Carol should be second')
      equal(entries[2], bobLocator, 'Bob should be third')
    })
  })

  describe('Test hasEntry', async () => {
    it('should return false if the address has no entry', async () => {
      let hasEntry = await index.hasEntry(aliceAddress)
      equal(hasEntry, false, 'hasEntry should have returned false')
    })

    it('should return true if the address has an entry', async () => {
      // give alice an entry
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      // now test again
      let hasEntry = await index.hasEntry(aliceAddress)
      equal(hasEntry, true, 'hasEntry should have returned true')
    })
  })
})
