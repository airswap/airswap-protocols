const Index = artifacts.require('Index')

const {
  passes,
  equal,
  reverted,
  emitted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { padAddressToLocator } = require('@airswap/test-utils').padding
const { EMPTY_ADDRESS, HEAD } = require('@airswap/order-utils').constants

contract('Index Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[1]
  let bobAddress = accounts[2]
  let carolAddress = accounts[3]
  let davidAddress = accounts[4]
  let emilyAddress = accounts[5]
  let fredAddress = accounts[6]

  let snapshotId
  let index

  let aliceLocator = padAddressToLocator(aliceAddress)
  let bobLocator = padAddressToLocator(bobAddress)
  let carolLocator = padAddressToLocator(carolAddress)
  let davidLocator = padAddressToLocator(davidAddress)
  let emilyLocator = padAddressToLocator(emilyAddress)
  let fredLocator = padAddressToLocator(fredAddress)
  let emptyLocator = padAddressToLocator(EMPTY_ADDRESS)

  // helpers
  const SCORE = 0
  const LOCATOR = 1

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

  describe('Test constructor', async () => {
    it('should setup the linked locators as just a head, length 0', async () => {
      let listLength = await index.length()
      equal(listLength, 0, 'list length should be 0')

      let locators = await index.fetchLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'list should have 10 slots')
      equal(locators[0], emptyLocator, 'The locator should be empty')
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
      let locators = await index.fetchLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'list should be of size 10')
      equal(locators[0], aliceLocator, 'Alice should be in list')
      equal(locators[1], emptyLocator, 'The second locator should be empty')

      // check the length has increased
      let listLength = await index.length()
      equal(listLength, 1, 'list length should be 1')
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

      let listLength = await index.length()
      equal(listLength, 3, 'list length should be 3')

      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
      equal(locators[2], bobLocator, 'Bob should be third')
    })

    it('should insert an identical stake after the pre-existing one', async () => {
      // two at 2000 and two at 0
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 0, bobLocator, {
        from: owner,
      })

      await index.setEntry(carolAddress, 2000, carolLocator, {
        from: owner,
      })
      await index.setEntry(davidAddress, 0, davidLocator, {
        from: owner,
      })

      let listLength = await index.length()
      equal(listLength, 4, 'Link list length should be 4')

      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
      equal(locators[2], bobLocator, 'Bob should be third')
      equal(locators[3], davidLocator, 'David should be fourth')
    })

    it('should not be able to set a second locator if one already exists for an address', async () => {
      let trx = index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await passes(trx)
      trx = index.setEntry(aliceAddress, 5000, aliceLocator, {
        from: owner,
      })
      await reverted(trx, 'ENTRY_ALREADY_EXISTS')

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
      equal(listLength, 3, 'list length should be 3')

      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
      equal(locators[2], bobLocator, 'Bob should be third')
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

      let listLength = await index.length()
      equal(listLength, 2, 'list length should be 2')

      let locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')

      await index.unsetEntry(aliceAddress, { from: owner })
      await index.unsetEntry(carolAddress, { from: owner })

      listLength = await index.length()
      equal(listLength, 0, 'list length should be 0')

      locators = await index.fetchLocators(EMPTY_ADDRESS, 4)
      equal(locators.length, 4, 'list should have 4 locators')
      equal(locators[0], emptyLocator, 'The first locator should be empty')
      equal(locators[1], emptyLocator, 'The second locator should be empty')
      equal(locators[2], emptyLocator, 'The third locator should be empty')
      equal(locators[3], emptyLocator, 'The fouth locator should be empty')
    })

    it('unsetting entry twice in a row for an address has no effect', async () => {
      let trx = index.unsetEntry(bobAddress, { from: owner })
      await passes(trx)
      let size = await index.length.call()
      equal(size, 2, 'Locator was improperly removed')
      trx = index.unsetEntry(bobAddress, { from: owner })
      await passes(trx)
      equal(size, 2, 'Locator was improperly removed')

      let locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
    })
  })

  describe('Test getLocator', async () => {
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
      let davidLocator = await index.getEntry(davidAddress)
      equal(davidLocator[SCORE], 0, 'David: Locator score not correct')
      equal(davidLocator[LOCATOR], emptyLocator, 'David: Locator not correct')

      // now for a recently unset entry
      await index.unsetEntry(carolAddress, { from: owner })
      let testLocator = await index.getEntry(carolAddress)
      equal(testLocator[SCORE], 0, 'Carol: Locator score not correct')
      equal(testLocator[LOCATOR], emptyLocator, 'Carol: Locator not correct')
    })

    it('should return the correct entry for a valid user', async () => {
      let aliceLocator = await index.getEntry(aliceAddress)
      equal(aliceLocator[SCORE], 2000, 'Alice: Locator score not correct')
      equal(aliceLocator[LOCATOR], aliceLocator, 'Alice: Locator not correct')

      let bobLocator = await index.getEntry(bobAddress)
      equal(bobLocator[SCORE], 500, 'Bob: Locator score not correct')
      equal(bobLocator[LOCATOR], bobLocator, 'Bob: Locator not correct')
    })
  })

  describe('Test fetchLocators', async () => {
    it('returns an array of empty locators', async () => {
      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators.length, 7, 'there should be 7 locators')
      equal(locators[0], emptyLocator, 'The first locator should be empty')
      equal(locators[1], emptyLocator, 'The second locator should be empty')
    })

    it('returns specified number of elements if < length', async () => {
      // add 3 locators
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      let locators = await index.fetchLocators(EMPTY_ADDRESS, 2)
      equal(locators.length, 2, 'there should only be 2 locators returned')

      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')

      // the same should happen passing HEAD
      locators = await index.fetchLocators(HEAD, 2)
      equal(locators.length, 2, 'there should only be 2 locators returned')

      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
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

      const locators = await index.fetchLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'there should be 10 locators returned')

      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
      equal(locators[2], bobLocator, 'Bob should be third')
      equal(locators[3], emptyLocator, 'Fourth slot should be empty')
      equal(locators[4], emptyLocator, 'Fifth slot should be empty')
    })

    it('starts the array at the specified starting user', async () => {
      // add 3 locators
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const locators = await index.fetchLocators(bobAddress, 10)
      equal(locators.length, 10, 'there should be 10 locators returned')

      equal(locators[0], bobLocator, 'Bob should be first')
      equal(locators[1], emptyLocator, 'Second slot should be empty')
      equal(locators[2], emptyLocator, 'Third slot should be empty')
    })

    it('starts the array at the specified starting user - longer list', async () => {
      // add 3 locators
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })
      await index.setEntry(davidAddress, 700, davidLocator, {
        from: owner,
      })
      await index.setEntry(emilyAddress, 1, emilyLocator, {
        from: owner,
      })
      await index.setEntry(fredAddress, 4000, fredLocator, {
        from: owner,
      })

      // fetch 4 from first element
      let locators = await index.fetchLocators(fredAddress, 4)
      equal(locators.length, 4, 'there should be 4 locators returned')

      equal(locators[0], fredLocator, 'Fred should be first')
      equal(locators[1], aliceLocator, 'Alice should be second')
      equal(locators[2], carolLocator, 'Carol should be third')
      equal(locators[3], davidLocator, 'David should be fourth')

      // now fetch the next 4
      locators = await index.fetchLocators(bobAddress, 4)
      equal(locators.length, 4, 'there should be 4 locators returned')
      equal(locators[0], bobLocator, 'Bob should be first')
      equal(locators[1], emilyLocator, 'Emily should be second')
      equal(locators[2], emptyLocator, 'Slot should be empty')
      equal(locators[3], emptyLocator, 'Slot should be empty')
    })

    it('throws an error for an unstaked user', async () => {
      // add 3 locators
      await index.setEntry(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setEntry(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setEntry(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      await reverted(
        index.fetchLocators(davidAddress, 10),
        'USER_HAS_NO_LOCATOR'
      )
    })
  })
})
