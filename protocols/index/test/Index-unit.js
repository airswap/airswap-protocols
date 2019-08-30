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
    let actualNextUser = (await index.signalsLinkedList(user, LIST_NEXT))[USER]
    let actualPrevUser = (await index.signalsLinkedList(user, LIST_PREV))[USER]
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

  describe('Test setSignal', async () => {
    it('should not allow a non owner to call setSignal', async () => {
      await reverted(
        index.setSignal(aliceAddress, 2000, aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow a signal to be inserted by the owner', async () => {
      // set a signal from the owner
      let result = await index.setSignal(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // check the SetSignal event was emitted
      emitted(result, 'SetSignal', event => {
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
      let headNext = await index.signalsLinkedList(LIST_HEAD, LIST_NEXT)

      equal(headNext[USER], aliceAddress, 'Signal address not correct')
      equal(headNext[SCORE], 2000, 'Signal score not correct')
      equal(headNext[LOCATOR], aliceLocator, 'Signal locator not correct')

      // check the length has increased
      let listLength = await index.length()
      equal(listLength, 1, 'Link list length should be 1')
    })

    it('should insert subsequent signals in the correct order', async () => {
      // insert alice
      await index.setSignal(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // now add more
      let result = await index.setSignal(bobAddress, 500, bobLocator, {
        from: owner,
      })

      // check the SetSignal event was emitted
      emitted(result, 'SetSignal', event => {
        return (
          event.user === bobAddress &&
          event.score.toNumber() === 500 &&
          event.locator === bobLocator
        )
      })

      await index.setSignal(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      await checkLinking(LIST_HEAD, aliceAddress, carolAddress)
      await checkLinking(aliceAddress, carolAddress, bobAddress)
      await checkLinking(carolAddress, bobAddress, LIST_HEAD)

      let listLength = await index.length()
      equal(listLength, 3, 'Link list length should be 3')

      const signals = await index.fetchSignals(7)
      equal(signals[0], aliceLocator, 'Alice should be first')
      equal(signals[1], carolLocator, 'Carol should be second')
      equal(signals[2], bobLocator, 'Bob should be third')
    })

    it('should not be able to set a second signal if one already exists for an address', async () => {
      let trx = index.setSignal(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await passes(trx)
      trx = index.setSignal(aliceAddress, 5000, aliceLocator, {
        from: owner,
      })
      await reverted(trx, 'USER_HAS_ENTRY')

      let length = await index.length.call()
      equal(length.toNumber(), 1, 'length increased, but total users has not')
    })
  })

  describe('Test unsetSignal', async () => {
    beforeEach('Setup signals', async () => {
      await index.setSignal(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setSignal(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setSignal(carolAddress, 1500, carolLocator, {
        from: owner,
      })
    })

    it('should not allow a non owner to call unsetSignal', async () => {
      await reverted(
        index.unsetSignal(aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should leave state unchanged for someone who hasnt staked', async () => {
      let returnValue = await index.unsetSignal.call(davidAddress, {
        from: owner,
      })
      equal(returnValue, false, 'unsetSignal should have returned false')

      await index.unsetSignal(davidAddress, { from: owner })

      let listLength = await index.length()
      equal(listLength, 3, 'Link list length should be 3')

      const signals = await index.fetchSignals(7)
      equal(signals[0], aliceLocator, 'Alice should be first')
      equal(signals[1], carolLocator, 'Carol should be second')
      equal(signals[2], bobLocator, 'Bob should be third')
    })

    it('should unset the signal for a valid user', async () => {
      // check it returns true
      let returnValue = await index.unsetSignal.call(bobAddress, {
        from: owner,
      })
      equal(returnValue, true, 'unsetSignal should have returned true')

      // check it emits an event correctly
      let result = await index.unsetSignal(bobAddress, { from: owner })
      emitted(result, 'UnsetSignal', event => {
        return event.user === bobAddress
      })

      // check the linked list of signals is updated correspondingly
      await checkLinking(LIST_HEAD, aliceAddress, carolAddress)
      await checkLinking(aliceAddress, carolAddress, LIST_HEAD)

      let listLength = await index.length()
      equal(listLength, 2, 'Link list length should be 2')

      const signals = await index.fetchSignals(7)
      equal(signals[0], aliceLocator, 'Alice should be first')
      equal(signals[1], carolLocator, 'Carol should be second')

      await index.unsetSignal(aliceAddress, { from: owner })
      await index.unsetSignal(carolAddress, { from: owner })

      await checkLinking(LIST_HEAD, LIST_HEAD, LIST_HEAD)
      listLength = await index.length()
      equal(listLength, 0, 'Link list length should be 0')
    })

    it('unsetting signal twice in a row for an address has no effect', async () => {
      let trx = index.unsetSignal(bobAddress, { from: owner })
      await passes(trx)
      let size = await index.length.call()
      equal(size, 2, 'Signal was improperly removed')
      trx = index.unsetSignal(bobAddress, { from: owner })
      await passes(trx)
      equal(size, 2, 'Signal was improperly removed')

      let signals = await index.fetchSignals(7)
      equal(signals[0], aliceLocator, 'Alice should be first')
      equal(signals[1], carolLocator, 'Carol should be second')
    })
  })

  describe('Test getSignal', async () => {
    beforeEach('Setup signals again', async () => {
      await index.setSignal(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setSignal(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setSignal(carolAddress, 1500, carolLocator, {
        from: owner,
      })
    })

    it('should return empty signal for a non-user', async () => {
      let davidSignal = await index.getSignal(davidAddress)
      equal(
        davidSignal[USER],
        EMPTY_ADDRESS,
        'David: Signal address not correct'
      )
      equal(davidSignal[SCORE], 0, 'David: Signal score not correct')
      equal(
        davidSignal[LOCATOR],
        emptyLocator,
        'David: Signal locator not correct'
      )

      // now for a recently unset signal
      await index.unsetSignal(carolAddress, { from: owner })
      let carolSignal = await index.getSignal(carolAddress)
      equal(
        carolSignal[USER],
        EMPTY_ADDRESS,
        'Carol: Signal address not correct'
      )
      equal(carolSignal[SCORE], 0, 'Carol: Signal score not correct')
      equal(
        carolSignal[LOCATOR],
        emptyLocator,
        'Carol: Signal locator not correct'
      )
    })

    it('should return the correct signal for a valid user', async () => {
      let aliceSignal = await index.getSignal(aliceAddress)
      equal(
        aliceSignal[USER],
        aliceAddress,
        'Alice: Signal address not correct'
      )
      equal(aliceSignal[SCORE], 2000, 'Alice: Signal score not correct')
      equal(
        aliceSignal[LOCATOR],
        aliceLocator,
        'Alice: Signal locator not correct'
      )

      let bobSignal = await index.getSignal(bobAddress)
      equal(bobSignal[USER], bobAddress, 'Bob: signal address not correct')
      equal(bobSignal[SCORE], 500, 'Bob: Signal score not correct')
      equal(bobSignal[LOCATOR], bobLocator, 'Bob: Signal locator not correct')
    })
  })

  describe('Test fetchSignals', async () => {
    it('returns an empty array with no signals', async () => {
      const signals = await index.fetchSignals(7)
      equal(signals.length, 0, 'there should be no signals')
    })

    it('returns specified number of elements if < length', async () => {
      // add 3 signals
      await index.setSignal(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setSignal(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setSignal(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const signals = await index.fetchSignals(2)
      equal(signals.length, 2, 'there should only be 2 signals returned')

      equal(signals[0], aliceLocator, 'Alice should be first')
      equal(signals[1], carolLocator, 'Carol should be second')
    })

    it('returns only length if requested number if larger', async () => {
      // add 3 signals
      await index.setSignal(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await index.setSignal(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await index.setSignal(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const signals = await index.fetchSignals(10)
      equal(signals.length, 3, 'there should only be 3 signals returned')

      equal(signals[0], aliceLocator, 'Alice should be first')
      equal(signals[1], carolLocator, 'Carol should be second')
      equal(signals[2], bobLocator, 'Bob should be third')
    })
  })

  describe('Test hasSignal', async () => {
    it('should return false if the address has no signal', async () => {
      let hasSignal = await index.hasSignal(aliceAddress)
      equal(hasSignal, false, 'hasSignal should have returned false')
    })

    it('should return true if the address has a signal', async () => {
      // give alice a signal
      await index.setSignal(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      // now test again
      let hasSignal = await index.hasSignal(aliceAddress)
      equal(hasSignal, true, 'hasSignal should have returned true')
    })
  })
})
