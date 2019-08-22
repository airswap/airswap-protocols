const Peer = artifacts.require('Peer')
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

const { orders, signatures } = require('@airswap/order-utils')

contract('Peer Unit Tests', async accounts => {
  const owner = accounts[0]
  const notOwner = accounts[2]
  let peer
  let mockSwap
  let snapshotId
  let swapFunction
  const TAKER_TOKEN = accounts[9]
  const MAKER_TOKEN = accounts[8]
  const MAX_PEER_AMOUNT = 12345
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
    const { order } = await orders.getOrder({})
    swapFunction = swapTemplate.contract.methods
      .swap(order, signatures.getEmptySignature())
      .encodeABI()

    mockSwap = await MockContract.new()
  }

  before('deploy Peer', async () => {
    await setupMockSwap()
    peer = await Peer.new(mockSwap.address, EMPTY_ADDRESS, { from: owner })
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contract', async () => {
      let val = await peer.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test owner is set correctly if provided the empty address', async () => {
      // being provided an empty address, it should leave the owner unchanged
      let val = await peer.owner.call()
      equal(val, owner, 'owner is incorrect - should be owner')
    })

    it('Test owner is set correctly if provided an address', async () => {
      let newPeer = await Peer.new(mockSwap.address, notOwner, { from: owner })

      // being provided an empty address, it should leave the owner unchanged
      let val = await newPeer.owner.call()
      equal(val, notOwner, 'owner is incorrect - should be notOwner')
    })
  })

  describe('Test setters', async () => {
    it('Test setRule permissions', async () => {
      await reverted(
        peer.setRule(
          TAKER_TOKEN,
          MAKER_TOKEN,
          MAX_PEER_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: notOwner }
        )
      )

      await passes(
        peer.setRule(
          TAKER_TOKEN,
          MAKER_TOKEN,
          MAX_PEER_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: owner }
        )
      )
    })

    it('Test setRule', async () => {
      let trx = await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //check if rule has been added
      let rule = await peer.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        rule[0].toNumber(),
        MAX_PEER_AMOUNT,
        'max peer amount is incorrectly saved'
      )
      equal(rule[1].toNumber(), PRICE_COEF, 'price coef is incorrectly saved')
      equal(rule[2].toNumber(), EXP, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'SetRule', e => {
        return (
          e.takerToken === TAKER_TOKEN &&
          e.makerToken === MAKER_TOKEN &&
          e.maxTakerAmount.toNumber() === MAX_PEER_AMOUNT &&
          e.priceCoef.toNumber() === PRICE_COEF &&
          e.priceExp.toNumber() === EXP
        )
      })
    })

    it('Test unsetRule permissions', async () => {
      await reverted(
        peer.unsetRule(TAKER_TOKEN, MAKER_TOKEN, { from: notOwner })
      )
      await passes(peer.unsetRule(TAKER_TOKEN, MAKER_TOKEN, { from: owner }))
    })

    it('Test unsetRule', async () => {
      let trx = await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //ensure rule has been added
      let ruleBefore = await peer.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        ruleBefore[0].toNumber(),
        MAX_PEER_AMOUNT,
        'max peer amount is incorrectly saved'
      )

      trx = await peer.unsetRule(TAKER_TOKEN, MAKER_TOKEN)

      //check that the rule has been removed
      let ruleAfter = await peer.rules.call(TAKER_TOKEN, MAKER_TOKEN)
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

  describe('Test getBuyQuote', async () => {
    it('test when rule does not exist', async () => {
      const NON_EXISTENT_TAKER_TOKEN = accounts[7]
      let val = await peer.getBuyQuote.call(
        1234,
        NON_EXISTENT_TAKER_TOKEN,
        MAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a peer does not exist'
      )
    })

    it('test when peer amount is greater than max peer amount', async () => {
      await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await peer.getBuyQuote.call(
        MAX_PEER_AMOUNT + 1,
        TAKER_TOKEN,
        MAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if peer amount is greater than peer max amount'
      )
    })

    it('test when peer amount is 0', async () => {
      await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await peer.getBuyQuote.call(0, TAKER_TOKEN, MAKER_TOKEN)
      equal(
        val.toNumber(),
        0,
        'no quote should be available if peer amount is 0'
      )
    })

    it('test a successful call - getBuyQuote', async () => {
      await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let val = await peer.getBuyQuote.call(1234, TAKER_TOKEN, MAKER_TOKEN)
      let expectedValue = Math.floor((1234 * PRICE_COEF) / 10 ** EXP)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getSellQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await peer.getSellQuote.call(4312, MAKER_TOKEN, TAKER_TOKEN)
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a peer does not exist'
      )
    })

    it('test when peer amount is not within acceptable value bounds', async () => {
      await peer.setRule(TAKER_TOKEN, MAKER_TOKEN, 100, 1, 0)
      let val = await peer.getSellQuote.call(0, MAKER_TOKEN, TAKER_TOKEN)
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned peer amount is 0'
      )

      val = await peer.getSellQuote.call(
        MAX_PEER_AMOUNT + 1,
        MAKER_TOKEN,
        TAKER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned greater than max peer amount'
      )
    })

    it('test a successful call - getSellQuote', async () => {
      await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let val = await peer.getSellQuote.call(500, MAKER_TOKEN, TAKER_TOKEN)
      let expectedValue = Math.floor((500 * 10 ** EXP) / PRICE_COEF)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getMaxQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await peer.getMaxQuote.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        val[0].toNumber(),
        0,
        'no quote should be available if a peer does not exist'
      )
      equal(
        val[1].toNumber(),
        0,
        'no quote should be available if a peer does not exist'
      )
    })

    it('test a successful call - getMaxQuote', async () => {
      await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await peer.getMaxQuote.call(TAKER_TOKEN, MAKER_TOKEN)

      equal(
        val[0].toNumber(),
        MAX_PEER_AMOUNT,
        'no quote should be available if a peer does not exist'
      )

      let expectedValue = Math.floor((MAX_PEER_AMOUNT * PRICE_COEF) / 10 ** EXP)
      equal(
        val[1].toNumber(),
        expectedValue,
        'no quote should be available if a peer does not exist'
      )
    })
  })

  describe('Test provideOrder', async () => {
    it('test if a rule does not exist', async () => {
      const { order } = await orders.getOrder({
        maker: {
          param: 555,
          token: MAKER_TOKEN,
        },
        taker: {
          param: 999,
          token: TAKER_TOKEN,
        },
      })
      await reverted(
        peer.provideOrder(order, signatures.getEmptySignature()),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('test if an order exceeds maximum amount', async () => {
      await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const { order } = await orders.getOrder({
        maker: {
          param: 555,
          token: MAKER_TOKEN,
        },
        taker: {
          param: MAX_PEER_AMOUNT + 1,
          token: TAKER_TOKEN,
        },
      })

      await reverted(
        peer.provideOrder(order, signatures.getEmptySignature()),
        'AMOUNT_EXCEEDS_MAX'
      )
    })

    it('test if order is priced according to the rule', async () => {
      await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const { order } = await orders.getOrder({
        maker: {
          param: 30,
          token: MAKER_TOKEN,
        },
        taker: {
          param: MAX_PEER_AMOUNT,
          token: TAKER_TOKEN,
        },
      })

      await reverted(peer.provideOrder(order, signatures.getEmptySignature()))
    })

    it('test a successful transaction with integer values', async () => {
      await peer.setRule(TAKER_TOKEN, MAKER_TOKEN, MAX_PEER_AMOUNT, 100, EXP)

      let ruleBefore = await peer.rules.call(TAKER_TOKEN, MAKER_TOKEN)

      let makerAmount = 100

      const { order } = await orders.getOrder({
        maker: {
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
        peer.provideOrder(order, signatures.getEmptySignature())
      )

      let ruleAfter = await peer.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - makerAmount,
        "rule's max peer amount was not decremented"
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
      await peer.setRule(
        TAKER_TOKEN,
        MAKER_TOKEN,
        MAX_PEER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let ruleBefore = await peer.rules.call(TAKER_TOKEN, MAKER_TOKEN)

      let makerAmount = 100
      let takerAmount = Math.floor((makerAmount * 10 ** EXP) / PRICE_COEF)

      const { order } = await orders.getOrder({
        maker: {
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
        peer.provideOrder(order, signatures.getEmptySignature())
      )

      let ruleAfter = await peer.rules.call(TAKER_TOKEN, MAKER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - takerAmount,
        "rule's max peer amount was not decremented"
      )
    })
  })

  describe('Test provideUnsignedOrder', async () => {
    it('test provideUnsignedOrder call', async () => {
      await peer.setRule(TAKER_TOKEN, MAKER_TOKEN, MAX_PEER_AMOUNT, 100, EXP)

      let makerAmount = 100
      await passes(
        //mock swapContract
        //test rule decrement
        peer.provideUnsignedOrder(
          1, //nonce
          makerAmount, //makerAmount
          MAKER_TOKEN, //makerToken
          100, //takerAmount
          TAKER_TOKEN //takerToken
        )
      )

      //check if swap() was called
      let invocationCount = await mockSwap.invocationCountForMethod.call(
        swapFunction
      )
      equal(
        invocationCount.toNumber(),
        1,
        'swap function was not called the expected number of times'
      )
    })
  })
})
