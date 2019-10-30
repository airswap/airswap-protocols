const Index = artifacts.require('Index')

const {
  passes,
  equal,
  reverted,
  emitted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { padAddressToLocator } = require('@airswap/test-utils').padding
const {
  EMPTY_ADDRESS,
  HEAD,
  LOCATORS,
  SCORES,
  NEXTID,
} = require('@airswap/order-utils').constants

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

  let result

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

      result = await index.getLocators(EMPTY_ADDRESS, 10)

      equal(result[LOCATORS].length, 0, 'locators list should have 0 slots')
      equal(result[SCORES].length, 0, 'scores list should have 0 slots')
      equal(result[NEXTID], HEAD, 'The next slot should be the head')
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
      result = await index.getLocators(EMPTY_ADDRESS, 10)

      equal(result[LOCATORS].length, 1, 'locators list should have 1 slots')
      equal(result[LOCATORS][0], aliceLocator, 'Alice should be in list')

      equal(result[SCORES].length, 1, 'scores list should have 1 slots')
      equal(result[SCORES][0], 2000, 'Alices score is incorrect')

      equal(result[NEXTID], HEAD, 'The next slot should be the head')

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

      result = await index.getLocators(EMPTY_ADDRESS, 7)

      equal(result[LOCATORS].length, 3, 'locators list should have 3 slots')
      equal(result[LOCATORS][0], aliceLocator, 'Alice should be in list')
      equal(result[LOCATORS][1], carolLocator, 'Carol should be second')
      equal(result[LOCATORS][2], bobLocator, 'Bob should be third')

      equal(result[SCORES].length, 3, 'scores list should have 3 slots')
      equal(result[SCORES][0], 2000, 'Alices score is incorrect')
      equal(result[SCORES][1], 1500, 'Carols score is incorrect')
      equal(result[SCORES][2], 500, 'Bobs score is incorrect')

      equal(result[NEXTID], HEAD, 'The next slot should be the head')
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

      result = await index.getLocators(EMPTY_ADDRESS, 7)

      equal(result[LOCATORS].length, 4, 'locators list should have 4 slots')
      equal(result[LOCATORS][0], aliceLocator, 'Alice should be in list')
      equal(result[LOCATORS][1], carolLocator, 'Carol should be second')
      equal(result[LOCATORS][2], bobLocator, 'Bob should be third')
      equal(result[LOCATORS][3], davidLocator, 'David should be fourth')

      equal(result[SCORES].length, 4, 'scores list should have 4 slots')
      equal(result[SCORES][0], 2000, 'Alices score is incorrect')
      equal(result[SCORES][1], 2000, 'Carols score is incorrect')
      equal(result[SCORES][2], 0, 'Bobs score is incorrect')
      equal(result[SCORES][3], 0, 'Davids score is incorrect')

      equal(result[NEXTID], HEAD, 'The next slot should be the head')
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

  describe('Test getting entries', async () => {
    it('should return the entry of a user', async () => {
      // set entry
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // retrieve entry
      let entry = await index.entries(aliceAddress)

      equal(aliceLocator, entry[0], 'locator was incorrectly set')
      equal(2000, entry[1], 'score was incorrectly set')
      equal(HEAD, entry[2], 'prev was incorrectly set')
      equal(HEAD, entry[3], 'next was incorrectly set')
    })

    it('should return empty entry for an unset user', async () => {
      // retrieve entry without setting the locator
      let entry = await index.entries(aliceAddress)

      equal(emptyLocator, entry[0], 'locator was incorrectly set')
      equal(0, entry[1], 'score was incorrectly set')
      equal(EMPTY_ADDRESS, entry[2], 'prev was incorrectly set')
      equal(EMPTY_ADDRESS, entry[3], 'next was incorrectly set')
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

      result = await index.getLocators(EMPTY_ADDRESS, 7)
      equal(result[LOCATORS].length, 3, 'locators list should have 3 slots')
      equal(result[LOCATORS][0], aliceLocator, 'Alice should be in list')
      equal(result[LOCATORS][1], carolLocator, 'Carol should be second')
      equal(result[LOCATORS][2], bobLocator, 'Bob should be third')

      equal(result[SCORES].length, 3, 'scores list should have 3 slots')
      equal(result[NEXTID], HEAD, 'The next slot should be the head')
    })

    it('should unset the entry for a valid user', async () => {
      // check it emits an event correctly
      let result = await index.unsetLocator(bobAddress, { from: owner })
      emitted(result, 'UnsetLocator', event => {
        return event.identifier === bobAddress
      })

      let listLength = await index.length()
      equal(listLength, 2, 'list length should be 2')

      result = await index.getLocators(EMPTY_ADDRESS, 7)
      equal(result[LOCATORS].length, 2, 'locators list should have 2 slots')
      equal(result[LOCATORS][0], aliceLocator, 'Alice should be in list')
      equal(result[LOCATORS][1], carolLocator, 'Carol should be second')

      equal(result[SCORES].length, 2, 'scores list should have 2 slots')
      equal(result[NEXTID], HEAD, 'The next slot should be the head')

      await index.unsetLocator(aliceAddress, { from: owner })
      await index.unsetLocator(carolAddress, { from: owner })

      listLength = await index.length()
      equal(listLength, 0, 'list length should be 0')

      result = await index.getLocators(EMPTY_ADDRESS, 10)

      equal(result[LOCATORS].length, 0, 'locators list should have 0 slots')
      equal(result[SCORES].length, 0, 'scores list should have 0 slots')
      equal(result[NEXTID], HEAD, 'The next slot should be the head')
    })
  })

  describe('Test getScore', async () => {
    beforeEach('Setup locators again', async () => {
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

    it('should return no score for a non-user', async () => {
      let davidScore = await index.getScore(davidAddress)
      equal(davidScore, 0, 'David: Locator score not correct')

      // now for a recently unset entry
      await index.unsetLocator(carolAddress, { from: owner })
      let testScore = await index.getScore(carolAddress)
      equal(testScore, 0, 'Carol: Locator score not correct')
    })

    it('should return the correct score for a valid user', async () => {
      let aliceScore = await index.getScore(aliceAddress)
      equal(aliceScore, 2000, 'Alice: Locator score not correct')

      let bobScore = await index.getScore(bobAddress)
      equal(bobScore, 500, 'Bob: Locator score not correct')
    })
  })

  describe('Test getLocator', async () => {
    beforeEach('Setup locators again', async () => {
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

    it('should return empty locator for a non-user', async () => {
      let locator = await index.getLocator(davidAddress)
      equal(locator, emptyLocator, 'David: Locator score not correct')

      // now for a recently unset entry
      await index.unsetLocator(carolAddress, { from: owner })
      locator = await index.getLocator(carolAddress)
      equal(locator, emptyLocator, 'Carol: Locator score not correct')
    })

    it('should return the correct locator for a valid user', async () => {
      let locator = await index.getLocator(aliceAddress)
      equal(locator, aliceLocator, 'Alice: Locator score not correct')

      locator = await index.getLocator(bobAddress)
      equal(locator, bobLocator, 'Bob: Locator score not correct')
    })
  })

  describe('Test getLocators', async () => {
    it('returns an array of empty locators', async () => {
      result = await index.getLocators(EMPTY_ADDRESS, 7)
      equal(result[LOCATORS].length, 0, 'locators list should have 0 slots')
      equal(result[SCORES].length, 0, 'scores list should have 0 slots')
      equal(result[NEXTID], HEAD, 'The next slot should be the head')
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

      result = await index.getLocators(EMPTY_ADDRESS, 2)

      equal(result[LOCATORS].length, 2, 'locators list should have 2 slots')
      equal(result[LOCATORS][0], aliceLocator, 'Alice should be in list')
      equal(result[LOCATORS][1], carolLocator, 'Carol should be second')

      equal(result[SCORES].length, 2, 'scores list should have 2 slots')
      equal(result[NEXTID], bobAddress, 'The next slot should be bob')

      // the same should happen passing HEAD
      result = await index.getLocators(HEAD, 2)
      equal(result[LOCATORS].length, 2, 'locators list should have 2 slots')
      equal(result[LOCATORS][0], aliceLocator, 'Alice should be in list')
      equal(result[LOCATORS][1], carolLocator, 'Carol should be second')

      equal(result[SCORES].length, 2, 'scores list should have 2 slots')
      equal(result[NEXTID], bobAddress, 'The next slot should be bob')
    })

    it('returns only length if requested number if larger', async () => {
      // add 3 entries
      await index.setLocator(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setLocator(bobAddress, 1700, bobLocator, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      result = await index.getLocators(EMPTY_ADDRESS, 10)

      equal(result[LOCATORS].length, 3, 'locators list should have 3 slots')
      equal(result[LOCATORS][0], aliceLocator, 'Alice should be in list')
      equal(result[LOCATORS][1], bobLocator, 'Bob should be second')
      equal(result[LOCATORS][2], carolLocator, 'Carol should be third')

      equal(result[SCORES].length, 3, 'scores list should have 3 slots')
      equal(result[SCORES][0], 2000, 'Alices score is incorrect')
      equal(result[SCORES][1], 1700, 'Bobs score is incorrect')
      equal(result[SCORES][2], 1500, 'Carols score is incorrect')

      equal(result[NEXTID], HEAD, 'The next slot should be the head')
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

      result = await index.getLocators(bobAddress, 10)

      equal(result[LOCATORS].length, 3, 'locators list should have 3 slots')
      equal(result[LOCATORS][0], bobLocator, 'Bob should be first')
      equal(result[LOCATORS][1], emptyLocator, 'Second slot should be empty')
      equal(result[LOCATORS][2], emptyLocator, 'Third slot should be empty')

      equal(result[SCORES].length, 3, 'scores list should have 3 slots')
      equal(result[SCORES][0], 500, 'Bobs score is incorrect')
      equal(result[SCORES][1], 0, 'Second slot should be empty')
      equal(result[SCORES][2], 0, 'Third slot should be empty')

      equal(result[NEXTID], HEAD, 'The next slot should be the head')
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
      result = await index.getLocators(fredAddress, 4)
      equal(result[LOCATORS].length, 4, 'there should be 4 locators returned')

      equal(result[LOCATORS][0], fredLocator, 'Fred should be first')
      equal(result[LOCATORS][1], aliceLocator, 'Alice should be second')
      equal(result[LOCATORS][2], carolLocator, 'Carol should be third')
      equal(result[LOCATORS][3], davidLocator, 'David should be fourth')

      equal(result[SCORES].length, 4, 'there should be 4 scores returned')
      equal(result[NEXTID], bobAddress, 'The next slot should be bobAddress')

      // now fetch the next 4
      result = await index.getLocators(bobAddress, 4)
      equal(result[LOCATORS].length, 4, 'there should be 4 returned')
      equal(result[LOCATORS][0], bobLocator, 'Bob should be first')
      equal(result[LOCATORS][1], emilyLocator, 'Emily should be second')
      equal(result[LOCATORS][2], emptyLocator, 'Slot should be empty')
      equal(result[LOCATORS][3], emptyLocator, 'Slot should be empty')

      equal(result[SCORES].length, 4, 'there should be 4 scores returned')
      equal(result[NEXTID], HEAD, 'The next slot should be the head')
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
        'CURSOR_NOT_FOUND'
      )
    })
  })
})
