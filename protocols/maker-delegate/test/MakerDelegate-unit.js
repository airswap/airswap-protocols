const MakerDelegate = artifacts.require('MakerDelegate')
const Swap = artifacts.require('Swap')
const MockContract = artifacts.require('MockContract')
const {
  equal,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

const { orders } = require('@airswap/order-utils')

contract('MakerDelegate Unit Tests', async accounts => {
  const owner = accounts[0]
  const notOwner = accounts[2]
  let makerDelegate
  let mockSwap
  let snapshotId
  let swapFunction
  const TAKER_TOKEN = accounts[9]
  const MAKER_TOKEN = accounts[8]
  const MAX_TAKER_AMOUNT = 12345
  const PRICE_COEF = 4321
  const EXP = 2

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockSwap() {
    let swapTemplate = await Swap.new()
    const order = await orders.getOrder({})
    swapFunction = swapTemplate.contract.methods.swap(order).encodeABI()

    mockSwap = await MockContract.new()

    orders.setVerifyingContract(mockSwap.address)
  }

  before('deploy MakerDelegate', async () => {
    await setupMockSwap()
    makerDelegate = await MakerDelegate.new(mockSwap.address, EMPTY_ADDRESS, {
      from: owner,
    })
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contract', async () => {
      let val = await makerDelegate.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test owner is set correctly if provided the empty address', async () => {
      // being provided an empty address, it should leave the owner unchanged
      let val = await makerDelegate.owner.call()
      equal(val, owner, 'owner is incorrect - should be owner')
    })

    it('Test owner is set correctly if provided an address', async () => {
      let newMakerDelegate = await MakerDelegate.new(
        mockSwap.address,
        notOwner,
        { from: owner }
      )

      // being provided an empty address, it should leave the owner unchanged
      let val = await newMakerDelegate.owner.call()
      equal(val, notOwner, 'owner is incorrect - should be notOwner')
    })
  })

  describe('Test setters', async () => {
    it('Test setRule permissions', async () => {
      await reverted(
        makerDelegate.setRule(
          TAKER_TOKEN,
          MAKER_TOKEN,
          MAX_TAKER_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: notOwner }
        )
      )

      await passes(
        makerDelegate.setRule(
          TAKER_TOKEN,
          MAKER_TOKEN,
          MAX_TAKER_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: owner }
        )
      )
    })

    it('Test setRule', async () => {
      let trx = await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //check if rule has been added
      let rule = await makerDelegate.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        rule[0].toNumber(),
        MAX_TAKER_AMOUNT,
        'max makerDelegate amount is incorrectly saved'
      )
      equal(rule[1].toNumber(), PRICE_COEF, 'price coef is incorrectly saved')
      equal(rule[2].toNumber(), EXP, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'SetRule', e => {
        return (
          e.takerToken === TAKER_TOKEN &&
          e.makerToken === MAKER_TOKEN &&
          e.maxTakerAmount.toNumber() === MAX_TAKER_AMOUNT &&
          e.priceCoef.toNumber() === PRICE_COEF &&
          e.priceExp.toNumber() === EXP
        )
      })
    })

    it('Test unsetRule permissions', async () => {
      await reverted(
        makerDelegate.unsetRule(TAKER_TOKEN, MAKER_TOKEN, { from: notOwner })
      )
      await passes(
        makerDelegate.unsetRule(TAKER_TOKEN, MAKER_TOKEN, { from: owner })
      )
    })

    it('Test unsetRule', async () => {
      let trx = await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //ensure rule has been added
      let ruleBefore = await makerDelegate.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        ruleBefore[0].toNumber(),
        MAX_TAKER_AMOUNT,
        'max makerDelegate amount is incorrectly saved'
      )

      trx = await makerDelegate.unsetRule(TAKER_TOKEN, MAKER_TOKEN)

      //check that the rule has been removed
      let ruleAfter = await makerDelegate.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        0,
        'max delgate amount is incorrectly saved'
      )
      equal(ruleAfter[1].toNumber(), 0, 'price coef is incorrectly saved')
      equal(ruleAfter[2].toNumber(), 0, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'UnsetRule', e => {
        return e.takerToken === TAKER_TOKEN && e.makerToken === MAKER_TOKEN
      })
    })
  })

  describe('Test getMakerSideQuote', async () => {
    it('test when rule does not exist', async () => {
      const NON_EXISTENT_TAKER_TOKEN = accounts[7]
      let val = await makerDelegate.getMakerSideQuote.call(
        1234,
        NON_EXISTENT_TAKER_TOKEN,
        MAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a makerDelegate does not exist'
      )
    })

    it('test when makerDelegate amount is greater than max makerDelegate amount', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await makerDelegate.getMakerSideQuote.call(
        MAX_TAKER_AMOUNT + 1,
        TAKER_TOKEN,
        MAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if makerDelegate amount is greater than makerDelegate max amount'
      )
    })

    it('test when makerDelegate amount is 0', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await makerDelegate.getMakerSideQuote.call(
        0,
        TAKER_TOKEN,
        MAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if makerDelegate amount is 0'
      )
    })

    it('test a successful call - getMakerSideQuote', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let val = await makerDelegate.getMakerSideQuote.call(
        1234,
        TAKER_TOKEN,
        MAKER_TOKEN
      )
      let expectedValue = Math.floor((1234 * PRICE_COEF) / 10 ** EXP)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getTakerSideQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await makerDelegate.getTakerSideQuote.call(
        4312,
        MAKER_TOKEN,
        TAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a makerDelegate does not exist'
      )
    })

    it('test when makerDelegate amount is not within acceptable value bounds', async () => {
      await makerDelegate.setRule(TAKER_TOKEN, MAKER_TOKEN, 100, 1, 0)
      let val = await makerDelegate.getTakerSideQuote.call(
        0,
        MAKER_TOKEN,
        TAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned makerDelegate amount is 0'
      )

      val = await makerDelegate.getTakerSideQuote.call(
        MAX_TAKER_AMOUNT + 1,
        MAKER_TOKEN,
        TAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned greater than max makerDelegate amount'
      )
    })

    it('test a successful call - getTakerSideQuote', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let val = await makerDelegate.getTakerSideQuote.call(
        500,
        MAKER_TOKEN,
        TAKER_TOKEN
      )
      let expectedValue = Math.floor((500 * 10 ** EXP) / PRICE_COEF)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getMaxQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await makerDelegate.getMaxQuote.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        val[0].toNumber(),
        0,
        'no quote should be available if a makerDelegate does not exist'
      )
      equal(
        val[1].toNumber(),
        0,
        'no quote should be available if a makerDelegate does not exist'
      )
    })

    it('test a successful call - getMaxQuote', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await makerDelegate.getMaxQuote.call(TAKER_TOKEN, MAKER_TOKEN)

      equal(
        val[0].toNumber(),
        MAX_TAKER_AMOUNT,
        'no quote should be available if a makerDelegate does not exist'
      )

      let expectedValue = Math.floor(
        (MAX_TAKER_AMOUNT * PRICE_COEF) / 10 ** EXP
      )
      equal(
        val[1].toNumber(),
        expectedValue,
        'no quote should be available if a makerDelegate does not exist'
      )
    })
  })

  describe('Test provideOrder', async () => {
    it('test if a rule does not exist', async () => {
      const order = await orders.getOrder({
        maker: {
          wallet: notOwner,
          param: 555,
          token: MAKER_TOKEN,
        },
        taker: {
          param: 999,
          token: TAKER_TOKEN,
        },
      })

      await reverted(
        makerDelegate.provideOrder(order, {
          from: notOwner,
        }),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('test if an order exceeds maximum amount', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const order = await orders.getOrder({
        maker: {
          wallet: notOwner,
          param: 555,
          token: MAKER_TOKEN,
        },
        taker: {
          param: MAX_TAKER_AMOUNT + 1,
          token: TAKER_TOKEN,
        },
      })

      await reverted(
        makerDelegate.provideOrder(order, {
          from: notOwner,
        }),
        'AMOUNT_EXCEEDS_MAX'
      )
    })

    it('test if order is priced according to the rule', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const order = await orders.getOrder({
        maker: {
          param: 30,
          token: MAKER_TOKEN,
        },
        taker: {
          param: MAX_TAKER_AMOUNT,
          token: TAKER_TOKEN,
        },
      })

      await reverted(
        makerDelegate.provideOrder(order, {
          from: notOwner,
        })
      )
    })

    it('test a successful transaction with integer values', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        100,
        EXP
      )

      let ruleBefore = await makerDelegate.rules.call(TAKER_TOKEN, MAKER_TOKEN)

      let makerAmount = 100

      const order = await orders.getOrder({
        maker: {
          wallet: notOwner,
          param: makerAmount,
          token: MAKER_TOKEN,
        },
        taker: {
          param: 100,
          token: TAKER_TOKEN,
        },
      })

      await passes(
        //mock swapContract
        //test rule decrement
        makerDelegate.provideOrder(order, {
          from: notOwner,
        })
      )

      let ruleAfter = await makerDelegate.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - makerAmount,
        "rule's max makerDelegate amount was not decremented"
      )

      //check if swap() was called
      let invocationCount = await mockSwap.invocationCountForMethod.call(
        swapFunction
      )
      equal(
        invocationCount,
        1,
        'swap function was not called the expected number of times'
      )
    })

    it('test a successful transaction with decimal values', async () => {
      await makerDelegate.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_TAKER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let ruleBefore = await makerDelegate.rules.call(TAKER_TOKEN, MAKER_TOKEN)

      let makerAmount = 100
      let takerAmount = Math.floor((makerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await orders.getOrder({
        maker: {
          wallet: notOwner,
          param: makerAmount,
          token: MAKER_TOKEN,
        },
        taker: {
          param: takerAmount,
          token: TAKER_TOKEN,
        },
      })

      await passes(
        //mock swapContract
        //test rule decrement
        makerDelegate.provideOrder(order, {
          from: notOwner,
        })
      )

      let ruleAfter = await makerDelegate.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - takerAmount,
        "rule's max makerDelegate amount was not decremented"
      )
    })
  })
})
