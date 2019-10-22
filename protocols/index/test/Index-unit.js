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
  let emilyAddress = accounts[5]
  let fredAddress = accounts[6]

  const HEAD = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'

  let snapshotId
  let index

  let aliceLocatorData = padAddressToLocator(aliceAddress)
  let bobLocatorData = padAddressToLocator(bobAddress)
  let carolLocatorData = padAddressToLocator(carolAddress)
  let davidLocatorData = padAddressToLocator(davidAddress)
  let emilyLocatorData = padAddressToLocator(emilyAddress)
  let fredLocatorData = padAddressToLocator(fredAddress)
  let emptyLocatorData = padAddressToLocator(EMPTY_ADDRESS)

  // helpers
  const USER = 'user'
  const SCORE = 'score'
  const DATA = 'data'

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
    it('should setup the linked list as just a head, length 0', async () => {
      let listLength = await index.length()
      equal(listLength, 0, 'Link list length should be 0')

      let locators = await index.fetchLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'list should have 10 slots')
      equal(locators[0], emptyLocatorData, 'The locator should be empty')
    })
  })

  describe('Test setLocator', async () => {
    it('should not allow a non owner to call setLocator', async () => {
      await reverted(
        index.setLocator(aliceAddress, 2000, aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow a locator to be inserted by the owner', async () => {
      // set a locator from the owner
      let result = await index.setLocator(
        aliceAddress,
        2000,
        aliceLocatorData,
        {
          from: owner,
        }
      )

      // check the SetLocator event was emitted
      emitted(result, 'SetLocator', event => {
        return (
          event.user === aliceAddress &&
          event.score.toNumber() === 2000 &&
          event.data === aliceLocatorData
        )
      })

      // check it has been inserted into the linked list correctly
      let locators = await index.fetchLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'list should be of size 10')
      equal(locators[0], aliceLocatorData, 'Alice should be in list')
      equal(locators[1], emptyLocatorData, 'The second locator should be empty')

      // check the length has increased
      let listLength = await index.length()
      equal(listLength, 1, 'Link list length should be 1')
    })

    it('should insert subsequent locators in the correct order', async () => {
      // insert alice
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })

      // now add more
      let result = await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })

      // check the SetLocator event was emitted
      emitted(result, 'SetLocator', event => {
        return (
          event.user === bobAddress &&
          event.score.toNumber() === 500 &&
          event.data === bobLocatorData
        )
      })

      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })

      let listLength = await index.length()
      equal(listLength, 3, 'Link list length should be 3')

      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
      equal(locators[2], bobLocatorData, 'Bob should be third')
    })

    it('should not be able to set a second locator if one already exists for an address', async () => {
      let trx = index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await passes(trx)
      trx = index.setLocator(aliceAddress, 5000, aliceLocatorData, {
        from: owner,
      })
      await reverted(trx, 'LOCATOR_ALREADY_SET')

      let length = await index.length.call()
      equal(length.toNumber(), 1, 'length increased, but total users has not')
    })
  })

  describe('Test unsetLocator', async () => {
    beforeEach('Setup locators', async () => {
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })
    })

    it('should not allow a non owner to call unsetLocator', async () => {
      await reverted(
        index.unsetLocator(aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should leave state unchanged for someone who hasnt staked', async () => {
      let returnValue = await index.unsetLocator.call(davidAddress, {
        from: owner,
      })
      equal(returnValue, false, 'unsetLocator should have returned false')

      await index.unsetLocator(davidAddress, { from: owner })

      let listLength = await index.length()
      equal(listLength, 3, 'Link list length should be 3')

      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
      equal(locators[2], bobLocatorData, 'Bob should be third')
    })

    it('should unset the locator for a valid user', async () => {
      // check it returns true
      let returnValue = await index.unsetLocator.call(bobAddress, {
        from: owner,
      })
      equal(returnValue, true, 'unsetLocator should have returned true')

      // check it emits an event correctly
      let result = await index.unsetLocator(bobAddress, { from: owner })
      emitted(result, 'UnsetLocator', event => {
        return event.user === bobAddress
      })

      let listLength = await index.length()
      equal(listLength, 2, 'Link list length should be 2')

      let locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')

      await index.unsetLocator(aliceAddress, { from: owner })
      await index.unsetLocator(carolAddress, { from: owner })

      listLength = await index.length()
      equal(listLength, 0, 'Link list length should be 0')

      locators = await index.fetchLocators(EMPTY_ADDRESS, 4)
      equal(locators.length, 4, 'list should have 4 locators')
      equal(locators[0], emptyLocatorData, 'The first locator should be empty')
      equal(locators[1], emptyLocatorData, 'The second locator should be empty')
      equal(locators[2], emptyLocatorData, 'The third locator should be empty')
      equal(locators[3], emptyLocatorData, 'The fouth locator should be empty')
    })

    it('unsetting locator twice in a row for an address has no effect', async () => {
      let trx = index.unsetLocator(bobAddress, { from: owner })
      await passes(trx)
      let size = await index.length.call()
      equal(size, 2, 'Locator was improperly removed')
      trx = index.unsetLocator(bobAddress, { from: owner })
      await passes(trx)
      equal(size, 2, 'Locator was improperly removed')

      let locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
    })
  })

  describe('Test getLocator', async () => {
    beforeEach('Setup locators again', async () => {
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })
    })

    it('should return empty locator for a non-user', async () => {
      let davidLocator = await index.getLocator(davidAddress)
      equal(
        davidLocator[USER],
        EMPTY_ADDRESS,
        'David: Locator address not correct'
      )
      equal(davidLocator[SCORE], 0, 'David: Locator score not correct')
      equal(davidLocator[DATA], emptyLocatorData, 'David: Locator not correct')

      // now for a recently unset locator
      await index.unsetLocator(carolAddress, { from: owner })
      let testLocator = await index.getLocator(carolAddress)
      equal(
        testLocator[USER],
        EMPTY_ADDRESS,
        'Carol: Locator address not correct'
      )
      equal(testLocator[SCORE], 0, 'Carol: Locator score not correct')
      equal(
        testLocator[DATA],
        emptyLocatorData,
        'Carol: Locator data not correct'
      )
    })

    it('should return the correct locator for a valid user', async () => {
      let aliceLocator = await index.getLocator(aliceAddress)
      equal(
        aliceLocator[USER],
        aliceAddress,
        'Alice: Locator address not correct'
      )
      equal(aliceLocator[SCORE], 2000, 'Alice: Locator score not correct')
      equal(
        aliceLocator[DATA],
        aliceLocatorData,
        'Alice: Locator data not correct'
      )

      let bobLocator = await index.getLocator(bobAddress)
      equal(bobLocator[USER], bobAddress, 'Bob: locator address not correct')
      equal(bobLocator[SCORE], 500, 'Bob: Locator score not correct')
      equal(
        bobLocator[DATA],
        bobLocatorData,
        'Bob: Locator locator data not correct'
      )
    })
  })

  describe('Test fetchLocators', async () => {
    it('returns an array of empty locators', async () => {
      const locators = await index.fetchLocators(EMPTY_ADDRESS, 7)
      equal(locators.length, 7, 'there should be 7 locators')
      equal(locators[0], emptyLocatorData, 'The first locator should be empty')
      equal(locators[1], emptyLocatorData, 'The second locator should be empty')
    })

    it('returns specified number of elements if < length', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })

      let locators = await index.fetchLocators(EMPTY_ADDRESS, 2)
      equal(locators.length, 2, 'there should only be 2 locators returned')

      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')

      // the same should happen passing HEAD
      locators = await index.fetchLocators(HEAD, 2)
      equal(locators.length, 2, 'there should only be 2 locators returned')

      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
    })

    it('returns trailing empty slots if requested number is larger', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })

      const locators = await index.fetchLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'there should be 10 locators returned')

      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
      equal(locators[2], bobLocatorData, 'Bob should be third')
      equal(locators[3], emptyLocatorData, 'Fourth slot should be empty')
      equal(locators[4], emptyLocatorData, 'Fifth slot should be empty')
    })

    it('starts the array at the specified starting user', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })

      const locators = await index.fetchLocators(bobAddress, 10)
      equal(locators.length, 10, 'there should be 10 locators returned')

      equal(locators[0], bobLocatorData, 'Bob should be first')
      equal(locators[1], emptyLocatorData, 'Second slot should be empty')
      equal(locators[2], emptyLocatorData, 'Third slot should be empty')
    })

    it('starts the array at the specified starting user - longer list', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })
      await index.setLocator(davidAddress, 700, davidLocatorData, {
        from: owner,
      })
      await index.setLocator(emilyAddress, 1, emilyLocatorData, {
        from: owner,
      })
      await index.setLocator(fredAddress, 4000, fredLocatorData, {
        from: owner,
      })

      // fetch 4 from first element
      let locators = await index.fetchLocators(fredAddress, 4)
      equal(locators.length, 4, 'there should be 4 locators returned')

      equal(locators[0], fredLocatorData, 'Fred should be first')
      equal(locators[1], aliceLocatorData, 'Alice should be second')
      equal(locators[2], carolLocatorData, 'Carol should be third')
      equal(locators[3], davidLocatorData, 'David should be fourth')

      // now fetch the next 4
      locators = await index.fetchLocators(bobAddress, 4)
      equal(locators.length, 4, 'there should be 4 locators returned')
      equal(locators[0], bobLocatorData, 'Bob should be first')
      equal(locators[1], emilyLocatorData, 'Emily should be second')
      equal(locators[2], emptyLocatorData, 'Slot should be empty')
      equal(locators[3], emptyLocatorData, 'Slot should be empty')
    })

    it('throws an error for an unstaked user', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })

      await reverted(
        index.fetchLocators(davidAddress, 10),
        'USER_HAS_NO_LOCATOR'
      )
    })
  })
})
