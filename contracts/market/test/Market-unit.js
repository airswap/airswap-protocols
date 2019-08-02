/* global artifacts, contract */
const Market = artifacts.require('Market')

const { equal, reverted, emitted } = require('@airswap/test-utils').assert
const {
  getTimestampPlusDays,
  takeSnapshot,
  revertToSnapShot,
} = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

const ALICE_LOC = intents.serialize(
  intents.Locators.INSTANT,
  '0x3768a06fefe82e7a20ad3a099ec4e908fba5fd04'
)
const BOB_LOC = intents.serialize(
  intents.Locators.CONTRACT,
  '0xbb58285762f0b56b6a206d6032fc6939eb26f4e8'
)
const CAROL_LOC = intents.serialize(
  intents.Locators.URL,
  'https://rpc.maker-cloud.io:80'
)

const NULL_LOCATOR = '0x'.padEnd(66, '0')

contract('Market Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[1]
  let bobAddress = accounts[2]
  let carolAddress = accounts[3]
  let davidAddress = accounts[4]

  let mockTokenOne = accounts[8]
  let mockTokenTwo = accounts[8]

  let snapshotId
  let market

  // linked list helpers
  const LIST_HEAD = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'
  const LIST_PREV = '0x00'
  const LIST_NEXT = '0x01'
  const STAKER = 'staker'
  const AMOUNT = 'amount'
  const EXPIRY = 'expiry'
  const LOCATOR = 'locator'

  // expiries
  let EXPIRY_ONE_DAY
  let EXPIRY_TWO_DAYS
  let EXPIRY_THREE_DAYS

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Setup', async () => {
    market = await Market.new(mockTokenOne, mockTokenTwo, { from: owner })
    EXPIRY_ONE_DAY = await getTimestampPlusDays(1)
    EXPIRY_TWO_DAYS = await getTimestampPlusDays(2)
    EXPIRY_THREE_DAYS = await getTimestampPlusDays(3)
  })

  async function checkLinking(prevStaker, staker, nextStaker) {
    let actualNextStaker = (await market.intentsLinkedList(staker, LIST_NEXT))[
      STAKER
    ]
    let actualPrevStaker = (await market.intentsLinkedList(staker, LIST_PREV))[
      STAKER
    ]
    equal(actualNextStaker, nextStaker, 'Next staker not set correctly')
    equal(actualPrevStaker, prevStaker, 'Prev staker not set correctly')
  }

  describe('Test constructor', async () => {
    it('should set maker token', async () => {
      const actualMakerToken = await market.makerToken()
      equal(actualMakerToken, mockTokenOne, 'Maker token set incorrectly')
    })

    it('should set taker token', async () => {
      const actualTakerToken = await market.takerToken()
      equal(actualTakerToken, mockTokenTwo, 'Taker token set incorrectly')
    })

    it('should setup the linked list as just a head, length 0', async () => {
      await checkLinking(LIST_HEAD, LIST_HEAD, LIST_HEAD)

      let listLength = await market.length()
      equal(listLength, 0, 'Link list length should be 0')
    })
  })

  describe('Test setIntent', async () => {
    it('should not allow a non owner to call setIntent', async () => {
      await reverted(
        market.setIntent(
          aliceAddress,
          2000,
          await getTimestampPlusDays(3),
          ALICE_LOC,
          { from: nonOwner }
        ),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow an intent to be inserted by the owner', async () => {
      // set an intent from the owner
      let result = await market.setIntent(
        aliceAddress,
        2000,
        EXPIRY_THREE_DAYS,
        ALICE_LOC,
        { from: owner }
      )

      // check the SetIntent event was emitted
      emitted(result, 'SetIntent', event => {
        return (
          event.staker === aliceAddress &&
          event.amount.toNumber() === 2000 &&
          event.expiry.toNumber() === EXPIRY_THREE_DAYS &&
          event.locator === ALICE_LOC &&
          event.makerToken === mockTokenOne &&
          event.takerToken === mockTokenTwo
        )
      })

      // check it has been inserted into the linked list correctly

      // check its been linked to the head correctly
      await checkLinking(aliceAddress, LIST_HEAD, aliceAddress)
      await checkLinking(LIST_HEAD, aliceAddress, LIST_HEAD)

      // check the values have been stored correctly
      let headNext = await market.intentsLinkedList(LIST_HEAD, LIST_NEXT)

      equal(headNext[STAKER], aliceAddress, 'Intent address not correct')
      equal(headNext[AMOUNT], 2000, 'Intent amount not correct')
      equal(headNext[EXPIRY], EXPIRY_THREE_DAYS, 'Intent expiry not correct')
      equal(headNext[LOCATOR], ALICE_LOC, 'Intent locator not correct')

      // check the length has increased
      let listLength = await market.length()
      equal(listLength, 1, 'Link list length should be 1')
    })

    it('should insert subsequent intents in the correct order', async () => {
      // insert alice
      await market.setIntent(aliceAddress, 2000, EXPIRY_THREE_DAYS, ALICE_LOC, {
        from: owner,
      })

      // now add more
      let result = await market.setIntent(
        bobAddress,
        500,
        EXPIRY_TWO_DAYS,
        BOB_LOC,
        { from: owner }
      )

      // check the SetIntent event was emitted
      emitted(result, 'SetIntent', event => {
        return (
          event.staker === bobAddress &&
          event.amount.toNumber() === 500 &&
          event.expiry.toNumber() === EXPIRY_TWO_DAYS &&
          event.locator === BOB_LOC &&
          event.makerToken === mockTokenOne &&
          event.takerToken === mockTokenTwo
        )
      })

      await market.setIntent(carolAddress, 1500, EXPIRY_ONE_DAY, CAROL_LOC, {
        from: owner,
      })

      await checkLinking(LIST_HEAD, aliceAddress, carolAddress)
      await checkLinking(aliceAddress, carolAddress, bobAddress)
      await checkLinking(carolAddress, bobAddress, LIST_HEAD)

      let listLength = await market.length()
      equal(listLength, 3, 'Link list length should be 3')

      const intents = await market.fetchIntents(7)
      equal(intents[0], ALICE_LOC, 'Alice should be first')
      equal(intents[1], CAROL_LOC, 'Carol should be second')
      equal(intents[2], BOB_LOC, 'Bob should be third')
    })
  })

  describe('Test unsetIntent', async () => {
    beforeEach('Setup intents', async () => {
      await market.setIntent(aliceAddress, 2000, EXPIRY_THREE_DAYS, ALICE_LOC, {
        from: owner,
      })
      await market.setIntent(bobAddress, 500, EXPIRY_TWO_DAYS, BOB_LOC, {
        from: owner,
      })
      await market.setIntent(carolAddress, 1500, EXPIRY_ONE_DAY, CAROL_LOC, {
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
      equal(intents[0], ALICE_LOC, 'Alice should be first')
      equal(intents[1], CAROL_LOC, 'Carol should be second')
      equal(intents[2], BOB_LOC, 'Bob should be third')
    })

    it('should unset the intent for a valid staker', async () => {
      // check it returns true
      let returnValue = await market.unsetIntent.call(bobAddress, {
        from: owner,
      })
      equal(returnValue, true, 'unsetIntent should have returned true')

      // check it emits an event correctly
      let result = await market.unsetIntent(bobAddress, { from: owner })
      emitted(result, 'UnsetIntent', event => {
        return (
          event.staker === bobAddress &&
          event.makerToken === mockTokenOne &&
          event.takerToken === mockTokenTwo
        )
      })

      // check the linked list of intents is updated correspondingly
      await checkLinking(LIST_HEAD, aliceAddress, carolAddress)
      await checkLinking(aliceAddress, carolAddress, LIST_HEAD)

      let listLength = await market.length()
      equal(listLength, 2, 'Link list length should be 2')

      const intents = await market.fetchIntents(7)
      equal(intents[0], ALICE_LOC, 'Alice should be first')
      equal(intents[1], CAROL_LOC, 'Carol should be second')

      await market.unsetIntent(aliceAddress, { from: owner })
      await market.unsetIntent(carolAddress, { from: owner })

      await checkLinking(LIST_HEAD, LIST_HEAD, LIST_HEAD)
      listLength = await market.length()
      equal(listLength, 0, 'Link list length should be 0')
    })
  })

  describe('Test getIntent', async () => {
    beforeEach('Setup intents again', async () => {
      await market.setIntent(aliceAddress, 2000, EXPIRY_THREE_DAYS, ALICE_LOC, {
        from: owner,
      })
      await market.setIntent(bobAddress, 500, EXPIRY_TWO_DAYS, BOB_LOC, {
        from: owner,
      })
      await market.setIntent(carolAddress, 1500, EXPIRY_ONE_DAY, CAROL_LOC, {
        from: owner,
      })
    })

    it('should return empty intent for a non-staker', async () => {
      let davidIntent = await market.getIntent(davidAddress)
      equal(
        davidIntent[STAKER],
        EMPTY_ADDRESS,
        'David: Intent address not correct'
      )
      equal(davidIntent[AMOUNT], 0, 'David: Intent amount not correct')
      equal(davidIntent[EXPIRY], 0, 'David: Intent expiry not correct')
      equal(
        davidIntent[LOCATOR],
        NULL_LOCATOR,
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
      equal(carolIntent[AMOUNT], 0, 'Carol: Intent amount not correct')
      equal(carolIntent[EXPIRY], 0, 'Carol: Intent expiry not correct')
      equal(
        carolIntent[LOCATOR],
        NULL_LOCATOR,
        'Carol: Intent locator not correct'
      )
    })

    it('should return the correct intent for a valid staker', async () => {
      let aliceIntent = await market.getIntent(aliceAddress)
      equal(
        aliceIntent[STAKER],
        aliceAddress,
        'Alice: Intent address not correct'
      )
      equal(aliceIntent[AMOUNT], 2000, 'Alice: Intent amount not correct')
      equal(
        aliceIntent[EXPIRY],
        EXPIRY_THREE_DAYS,
        'Alice: Intent expiry not correct'
      )
      equal(
        aliceIntent[LOCATOR],
        ALICE_LOC,
        'Alice: Intent locator not correct'
      )

      let bobIntent = await market.getIntent(bobAddress)
      equal(bobIntent[STAKER], bobAddress, 'Bob: intent address not correct')
      equal(bobIntent[AMOUNT], 500, 'Bob: Intent amount not correct')
      equal(
        bobIntent[EXPIRY],
        EXPIRY_TWO_DAYS,
        'Bob: Intent expiry not correct'
      )
      equal(bobIntent[LOCATOR], BOB_LOC, 'Bob: Intent locator not correct')
    })
  })

  describe('Test fetchIntents')
  describe('Test isIntentExpired and cleanExpiredIntents')
  describe('Test hashIntent')
})
