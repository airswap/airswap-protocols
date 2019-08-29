const Market = artifacts.require('Market')

const {
  passes,
  equal,
  reverted,
  emitted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { padAddressToLocator } = require('@airswap/test-utils').padding
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

contract('Market Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[1]
  let bobAddress = accounts[2]
  let carolAddress = accounts[3]
  let davidAddress = accounts[4]

  let snapshotId
  let market

  let aliceLocator = padAddressToLocator(aliceAddress)
  let bobLocator = padAddressToLocator(bobAddress)
  let carolLocator = padAddressToLocator(carolAddress)
  let emptyLocator = padAddressToLocator(EMPTY_ADDRESS)

  // linked list helpers
  const LIST_HEAD = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'
  const LIST_PREV = '0x00'
  const LIST_NEXT = '0x01'
  const STAKER = 'user'
  const AMOUNT = 'score'
  const LOCATOR = 'locator'

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Setup', async () => {
    market = await Market.new({ from: owner })
  })

  async function checkLinking(prevUser, user, nextUser) {
    let actualNextUser = (await market.list(user, LIST_NEXT))[STAKER]
    let actualPrevUser = (await market.list(user, LIST_PREV))[STAKER]
    equal(actualNextUser, nextUser, 'Next user not set correctly')
    equal(actualPrevUser, prevUser, 'Prev user not set correctly')
  }

  describe('Test constructor', async () => {
    it('should setup the linked list as just a head, length 0', async () => {
      await checkLinking(LIST_HEAD, LIST_HEAD, LIST_HEAD)

      let listLength = await market.length()
      equal(listLength, 0, 'Link list length should be 0')
    })
  })

  describe('Test setIntent', async () => {
    it('should not allow a non owner to call setIntent', async () => {
      await reverted(
        market.setIntent(aliceAddress, 2000, aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow an intent to be inserted by the owner', async () => {
      // set an intent from the owner
      let result = await market.setIntent(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // check the SetIntent event was emitted
      emitted(result, 'SetIntent', event => {
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
      let headNext = await market.list(LIST_HEAD, LIST_NEXT)

      equal(headNext[STAKER], aliceAddress, 'Intent address not correct')
      equal(headNext[AMOUNT], 2000, 'Intent score not correct')
      equal(headNext[LOCATOR], aliceLocator, 'Intent locator not correct')

      // check the length has increased
      let listLength = await market.length()
      equal(listLength, 1, 'Link list length should be 1')
    })

    it('should insert subsequent intents in the correct order', async () => {
      // insert alice
      await market.setIntent(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })

      // now add more
      let result = await market.setIntent(bobAddress, 500, bobLocator, {
        from: owner,
      })

      // check the SetIntent event was emitted
      emitted(result, 'SetIntent', event => {
        return (
          event.user === bobAddress &&
          event.score.toNumber() === 500 &&
          event.locator === bobLocator
        )
      })

      await market.setIntent(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      await checkLinking(LIST_HEAD, aliceAddress, carolAddress)
      await checkLinking(aliceAddress, carolAddress, bobAddress)
      await checkLinking(carolAddress, bobAddress, LIST_HEAD)

      let listLength = await market.length()
      equal(listLength, 3, 'Link list length should be 3')

      const intents = await market.fetchIntents(7)
      equal(intents[0], aliceLocator, 'Alice should be first')
      equal(intents[1], carolLocator, 'Carol should be second')
      equal(intents[2], bobLocator, 'Bob should be third')
    })

    it('should not be able to set a second intent if one already exists for an address', async () => {
      let trx = market.setIntent(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await passes(trx)
      trx = market.setIntent(aliceAddress, 5000, aliceLocator, {
        from: owner,
      })
      await reverted(trx, 'USER_HAS_INTENT')

      let length = await market.length.call()
      equal(length.toNumber(), 1, 'length increased, but total users has not')
    })
  })

  describe('Test unsetIntent', async () => {
    beforeEach('Setup intents', async () => {
      await market.setIntent(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await market.setIntent(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await market.setIntent(carolAddress, 1500, carolLocator, {
        from: owner,
      })
    })

    it('should not allow a non owner to call unsetIntent', async () => {
      await reverted(
        market.unsetIntent(aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should leave state unchanged for someone who hasnt staked', async () => {
      let returnValue = await market.unsetIntent.call(davidAddress, {
        from: owner,
      })
      equal(returnValue, false, 'unsetIntent should have returned false')

      await market.unsetIntent(davidAddress, { from: owner })

      let listLength = await market.length()
      equal(listLength, 3, 'Link list length should be 3')

      const intents = await market.fetchIntents(7)
      equal(intents[0], aliceLocator, 'Alice should be first')
      equal(intents[1], carolLocator, 'Carol should be second')
      equal(intents[2], bobLocator, 'Bob should be third')
    })

    it('should unset the intent for a valid user', async () => {
      // check it returns true
      let returnValue = await market.unsetIntent.call(bobAddress, {
        from: owner,
      })
      equal(returnValue, true, 'unsetIntent should have returned true')

      // check it emits an event correctly
      let result = await market.unsetIntent(bobAddress, { from: owner })
      emitted(result, 'UnsetIntent', event => {
        return event.user === bobAddress
      })

      // check the linked list of intents is updated correspondingly
      await checkLinking(LIST_HEAD, aliceAddress, carolAddress)
      await checkLinking(aliceAddress, carolAddress, LIST_HEAD)

      let listLength = await market.length()
      equal(listLength, 2, 'Link list length should be 2')

      const intents = await market.fetchIntents(7)
      equal(intents[0], aliceLocator, 'Alice should be first')
      equal(intents[1], carolLocator, 'Carol should be second')

      await market.unsetIntent(aliceAddress, { from: owner })
      await market.unsetIntent(carolAddress, { from: owner })

      await checkLinking(LIST_HEAD, LIST_HEAD, LIST_HEAD)
      listLength = await market.length()
      equal(listLength, 0, 'Link list length should be 0')
    })

    it('unsetting intent twice in a row for an address has no effect', async () => {
      let trx = market.unsetIntent(bobAddress, { from: owner })
      await passes(trx)
      let size = await market.length.call()
      equal(size, 2, 'Intent was improperly removed')
      trx = market.unsetIntent(bobAddress, { from: owner })
      await passes(trx)
      equal(size, 2, 'Intent was improperly removed')

      let intents = await market.fetchIntents(7)
      equal(intents[0], aliceLocator, 'Alice should be first')
      equal(intents[1], carolLocator, 'Carol should be second')
    })
  })

  describe('Test getIntent', async () => {
    beforeEach('Setup intents again', async () => {
      await market.setIntent(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await market.setIntent(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await market.setIntent(carolAddress, 1500, carolLocator, {
        from: owner,
      })
    })

    it('should return empty intent for a non-user', async () => {
      let davidIntent = await market.getIntent(davidAddress)
      equal(
        davidIntent[STAKER],
        EMPTY_ADDRESS,
        'David: Intent address not correct'
      )
      equal(davidIntent[AMOUNT], 0, 'David: Intent score not correct')
      equal(
        davidIntent[LOCATOR],
        emptyLocator,
        'David: Intent locator not correct'
      )

      // now for a recently unset intent
      await market.unsetIntent(carolAddress, { from: owner })
      let carolIntent = await market.getIntent(carolAddress)
      equal(
        carolIntent[STAKER],
        EMPTY_ADDRESS,
        'Carol: Intent address not correct'
      )
      equal(carolIntent[AMOUNT], 0, 'Carol: Intent score not correct')
      equal(
        carolIntent[LOCATOR],
        emptyLocator,
        'Carol: Intent locator not correct'
      )
    })

    it('should return the correct intent for a valid user', async () => {
      let aliceIntent = await market.getIntent(aliceAddress)
      equal(
        aliceIntent[STAKER],
        aliceAddress,
        'Alice: Intent address not correct'
      )
      equal(aliceIntent[AMOUNT], 2000, 'Alice: Intent score not correct')
      equal(
        aliceIntent[LOCATOR],
        aliceLocator,
        'Alice: Intent locator not correct'
      )

      let bobIntent = await market.getIntent(bobAddress)
      equal(bobIntent[STAKER], bobAddress, 'Bob: intent address not correct')
      equal(bobIntent[AMOUNT], 500, 'Bob: Intent score not correct')
      equal(bobIntent[LOCATOR], bobLocator, 'Bob: Intent locator not correct')
    })
  })

  describe('Test fetchIntents', async () => {
    it('returns an empty array with no intents', async () => {
      const intents = await market.fetchIntents(7)
      equal(intents.length, 0, 'there should be no intents')
    })

    it('returns specified number of elements if < length', async () => {
      // add 3 intents
      await market.setIntent(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await market.setIntent(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await market.setIntent(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const intents = await market.fetchIntents(2)
      equal(intents.length, 2, 'there should only be 2 intents returned')

      equal(intents[0], aliceLocator, 'Alice should be first')
      equal(intents[1], carolLocator, 'Carol should be second')
    })

    it('returns only length if requested number if larger', async () => {
      // add 3 intents
      await market.setIntent(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      await market.setIntent(bobAddress, 500, bobLocator, {
        from: owner,
      })
      await market.setIntent(carolAddress, 1500, carolLocator, {
        from: owner,
      })

      const intents = await market.fetchIntents(10)
      equal(intents.length, 3, 'there should only be 3 intents returned')

      equal(intents[0], aliceLocator, 'Alice should be first')
      equal(intents[1], carolLocator, 'Carol should be second')
      equal(intents[2], bobLocator, 'Bob should be third')
    })
  })

  describe('Test hasIntent', async () => {
    it('should return false if the address has no intent', async () => {
      let hasIntent = await market.hasIntent(aliceAddress)
      equal(hasIntent, false, 'hasIntent should have returned false')
    })

    it('should return true if the address has an intent', async () => {
      // give alice an intent
      await market.setIntent(aliceAddress, 2000, aliceLocator, {
        from: owner,
      })
      // now test again
      let hasIntent = await market.hasIntent(aliceAddress)
      equal(hasIntent, true, 'hasIntent should have returned true')
    })
  })
})
