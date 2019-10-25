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

      let locators = await index.getLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'list should have 10 slots')
      equal(locators[0], emptyLocator, 'The locator should be empty')
    })
  })

  describe('Test setLocator', async () => {
    it('should not allow a non owner to call setLocator', async () => {
      await reverted(
        index.setLocator(aliceAddress, 2000, aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow an entry to be inserted by the owner', async () => {
      // set an entry from the owner
      let result = await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // check the SetLocator event was emitted
      emitted(result, 'SetLocator', event => {
        return (
          event.identifier === aliceAddress &&
          event.score.toNumber() === 2000 &&
          event.locator === aliceLocator
        )
      })

      // check it has been inserted into the linked list correctly
      let locators = await index.getLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'list should be of size 10')
      equal(locators[0], aliceLocator, 'Alice should be in list')
      equal(locators[1], emptyLocator, 'The second locator should be empty')

      // check the length has increased
      let listLength = await index.length()
      equal(listLength, 1, 'list length should be 1')
    })

    it('should insert subsequent entries in the correct order', async () => {
      // insert alice
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // now add more
      let result = await index.setLocator(bobAddress, 500, bobLocator, {
        from: owner,
      })

      // check the SetLocator event was emitted
      emitted(result, 'SetLocator', event => {
        return (
          event.identifier === bobAddress &&
          event.score.toNumber() === 500 &&
          event.locator === bobLocator
        )
      })

      await index.setLocator(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      let listLength = await index.length()
      equal(listLength, 3, 'list length should be 3')

      const locators = await index.getLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
      equal(locators[2], bobLocator, 'Bob should be third')
    })

    it('should insert an identical stake after the pre-existing one', async () => {
      // two at 2000 and two at 0
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 0, bobLocator, {
        from: owner,
      })

      await index.setLocator(carolAddress, 2000, carolLocator, {
        from: owner,
      })
      await index.setLocator(davidAddress, 0, davidLocator, {
        from: owner,
      })

      let listLength = await index.length()
      equal(listLength, 4, 'Link list length should be 4')

      const locators = await index.getLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
      equal(locators[2], bobLocator, 'Bob should be third')
      equal(locators[3], davidLocator, 'David should be fourth')
    })

    it('should not be able to set a second locator if one already exists for an address', async () => {
      let trx = index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await passes(trx)
      trx = index.setLocator(aliceAddress, 5000, aliceLocator, {
        from: owner,
      })
      await reverted(trx, 'ENTRY_ALREADY_EXISTS')

      let length = await index.length.call()
      equal(length.toNumber(), 1, 'length increased, but total users has not')
    })
  })

  describe('Test unsetLocator', async () => {
    beforeEach('Setup entries', async () => {
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocator, {
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
      let trx = index.unsetLocator(davidAddress, {
        from: owner,
      })
      await reverted(trx, 'ENTRY_DOES_NOT_EXIST')

      let listLength = await index.length()
      equal(listLength, 3, 'list length should be 3')

      const locators = await index.getLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
      equal(locators[2], bobLocator, 'Bob should be third')
    })

    it('should unset the entry for a valid user', async () => {
      // check it returns true
      let returnValue = await index.unsetLocator.call(bobAddress, {
        from: owner,
      })
      equal(returnValue, true, 'unsetLocator should have returned true')

      // check it emits an event correctly
      let result = await index.unsetLocator(bobAddress, { from: owner })
      emitted(result, 'UnsetLocator', event => {
        return event.identifier === bobAddress
      })

      let listLength = await index.length()
      equal(listLength, 2, 'list length should be 2')

      let locators = await index.getLocators(EMPTY_ADDRESS, 7)
      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')

      await index.unsetLocator(aliceAddress, { from: owner })
      await index.unsetLocator(carolAddress, { from: owner })

      listLength = await index.length()
      equal(listLength, 0, 'list length should be 0')

      locators = await index.getLocators(EMPTY_ADDRESS, 4)
      equal(locators.length, 4, 'list should have 4 locators')
      equal(locators[0], emptyLocator, 'The first locator should be empty')
      equal(locators[1], emptyLocator, 'The second locator should be empty')
      equal(locators[2], emptyLocator, 'The third locator should be empty')
      equal(locators[3], emptyLocator, 'The fouth locator should be empty')
    })
  })

  describe('Test getLocator', async () => {
    beforeEach('Setup entries again', async () => {
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocator, {
        from: owner,
      })
    })

    it('should return empty entry for a non-user', async () => {
      let davidScore = await index.getScore(davidAddress)
      equal(davidScore, 0, 'David: Locator score not correct')

      // now for a recently unset entry
      await index.unsetLocator(carolAddress, { from: owner })
      let testScore = await index.getScore(carolAddress)
      equal(testScore, 0, 'Carol: Locator score not correct')
    })

    it('should return the correct entry for a valid user', async () => {
      let aliceScore = await index.getScore(aliceAddress)
      equal(aliceScore, 2000, 'Alice: Locator score not correct')

      let bobScore = await index.getScore(bobAddress)
      equal(bobScore, 500, 'Bob: Locator score not correct')
    })
  })

  describe('Test getLocators', async () => {
    it('returns an array of empty locators', async () => {
      const locators = await index.getLocators(EMPTY_ADDRESS, 7)
      equal(locators.length, 7, 'there should be 7 locators')
      equal(locators[0], emptyLocator, 'The first locator should be empty')
      equal(locators[1], emptyLocator, 'The second locator should be empty')
    })

    it('returns specified number of elements if < length', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      let locators = await index.getLocators(EMPTY_ADDRESS, 2)
      equal(locators.length, 2, 'there should only be 2 locators returned')

      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')

      // the same should happen passing HEAD
      locators = await index.getLocators(HEAD, 2)
      equal(locators.length, 2, 'there should only be 2 locators returned')

      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
    })

    it('returns only length if requested number if larger', async () => {
      // add 3 entries
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const locators = await index.getLocators(EMPTY_ADDRESS, 10)
      equal(locators.length, 10, 'there should be 10 locators returned')

      equal(locators[0], aliceLocator, 'Alice should be first')
      equal(locators[1], carolLocator, 'Carol should be second')
      equal(locators[2], bobLocator, 'Bob should be third')
      equal(locators[3], emptyLocator, 'Fourth slot should be empty')
      equal(locators[4], emptyLocator, 'Fifth slot should be empty')
    })

    it('starts the array at the specified starting user', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const locators = await index.getLocators(bobAddress, 10)
      equal(locators.length, 10, 'there should be 10 locators returned')

      equal(locators[0], bobLocator, 'Bob should be first')
      equal(locators[1], emptyLocator, 'Second slot should be empty')
      equal(locators[2], emptyLocator, 'Third slot should be empty')
    })

    it('starts the array at the specified starting user - longer list', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocator, {
        from: owner,
      })
      await index.setLocator(davidAddress, 700, davidLocator, {
        from: owner,
      })
      await index.setLocator(emilyAddress, 1, emilyLocator, {
        from: owner,
      })
      await index.setLocator(fredAddress, 4000, fredLocator, {
        from: owner,
      })

      // fetch 4 from first element
      let locators = await index.getLocators(fredAddress, 4)
      equal(locators.length, 4, 'there should be 4 locators returned')

      equal(locators[0], fredLocator, 'Fred should be first')
      equal(locators[1], aliceLocator, 'Alice should be second')
      equal(locators[2], carolLocator, 'Carol should be third')
      equal(locators[3], davidLocator, 'David should be fourth')

      // now fetch the next 4
      locators = await index.getLocators(bobAddress, 4)
      equal(locators.length, 4, 'there should be 4 locators returned')
      equal(locators[0], bobLocator, 'Bob should be first')
      equal(locators[1], emilyLocator, 'Emily should be second')
      equal(locators[2], emptyLocator, 'Slot should be empty')
      equal(locators[3], emptyLocator, 'Slot should be empty')
    })

    it('throws an error for an unstaked user', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      await reverted(
        index.getLocators(davidAddress, 10),
        'START_ENTRY_NOT_FOUND'
      )
    })
  })
})
