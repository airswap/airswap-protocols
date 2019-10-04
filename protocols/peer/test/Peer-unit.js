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

const { orders } = require('@airswap/order-utils')

contract('Peer Unit Tests', async accounts => {
  const owner = accounts[0]
  const tradeWallet = accounts[1]
  const notOwner = accounts[2]
  const notTradeWallet = accounts[3]
  let peer
  let mockSwap
  let snapshotId
  let swapFunction
  const SIGNER_TOKEN = accounts[9]
  const SENDER_TOKEN = accounts[8]
  const MAX_SENDER_AMOUNT = 12345
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

  before('deploy Peer', async () => {
    await setupMockSwap()
    peer = await Peer.new(mockSwap.address, EMPTY_ADDRESS, tradeWallet, {
      from: owner,
    })
  })

  describe('Test constructor', async () => {
    it('Test initial Swap Contract', async () => {
      let val = await peer.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test initial trade wallet value', async () => {
      let val = await peer.tradeWallet.call()
      equal(val, tradeWallet, 'trade wallet is incorrect')
    })

    it('Test constructor sets the owner as the trade wallet on empty address', async () => {
      let newPeer = await Peer.new(
        mockSwap.address,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        {
          from: owner,
        }
      )

      let val = await newPeer.tradeWallet.call()
      equal(val, owner, 'trade wallet is incorrect')
    })

    it('Test owner is set correctly if provided the empty address', async () => {
      // being provided an empty address, it should leave the owner unchanged
      let val = await peer.owner.call()
      equal(val, owner, 'owner is incorrect - should be owner')
    })

    it('Test owner is set correctly if provided an address', async () => {
      let newPeer = await Peer.new(mockSwap.address, notOwner, tradeWallet, {
        from: owner,
      })

      // being provided an empty address, it should leave the owner unchanged
      let val = await newPeer.owner.call()
      equal(val, notOwner, 'owner is incorrect - should be notOwner')
    })
  })

  describe('Test setters', async () => {
    it('Test setRule permissions', async () => {
      await reverted(
        peer.setRule(
          SIGNER_TOKEN,
          SENDER_TOKEN,
          MAX_SENDER_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: notOwner }
        )
      )

      await passes(
        peer.setRule(
          SIGNER_TOKEN,
          SENDER_TOKEN,
          MAX_SENDER_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: owner }
        )
      )
    })

    it('Test setRule', async () => {
      let trx = await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //check if rule has been added
      let rule = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)
      equal(
        rule[0].toNumber(),
        MAX_SENDER_AMOUNT,
        'max peer amount is incorrectly saved'
      )
      equal(rule[1].toNumber(), PRICE_COEF, 'price coef is incorrectly saved')
      equal(rule[2].toNumber(), EXP, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'SetRule', e => {
        return (
          e.signerToken === SIGNER_TOKEN &&
          e.senderToken === SENDER_TOKEN &&
          e.maxSenderAmount.toNumber() === MAX_SENDER_AMOUNT &&
          e.priceCoef.toNumber() === PRICE_COEF &&
          e.priceExp.toNumber() === EXP
        )
      })
    })

    it('Test unsetRule permissions', async () => {
      await reverted(
        peer.unsetRule(SIGNER_TOKEN, SENDER_TOKEN, { from: notOwner })
      )
      await passes(peer.unsetRule(SIGNER_TOKEN, SENDER_TOKEN, { from: owner }))
    })

    it('Test unsetRule', async () => {
      let trx = await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //ensure rule has been added
      let ruleBefore = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)
      equal(
        ruleBefore[0].toNumber(),
        MAX_SENDER_AMOUNT,
        'max peer amount is incorrectly saved'
      )

      trx = await peer.unsetRule(SIGNER_TOKEN, SENDER_TOKEN)

      //check that the rule has been removed
      let ruleAfter = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        0,
        'max delgate amount is incorrectly saved'
      )
      equal(ruleAfter[1].toNumber(), 0, 'price coef is incorrectly saved')
      equal(ruleAfter[2].toNumber(), 0, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'UnsetRule', e => {
        return e.senderToken === SENDER_TOKEN && e.signerToken === SIGNER_TOKEN
      })
    })
  })

  describe('Test setSenderWallet', async () => {
    it('Test setSenderWallet permissions', async () => {
      await reverted(peer.setTradeWallet(notOwner, { from: notOwner }))

      await passes(peer.setTradeWallet(notOwner, { from: owner }))
    })
  })

  describe('Test getSignerSideQuote', async () => {
    it('test when rule does not exist', async () => {
      const NON_EXISTENT_SIGNER_TOKEN = accounts[7]
      let val = await peer.getSignerSideQuote.call(
        1234,
        NON_EXISTENT_SIGNER_TOKEN,
        SENDER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a peer does not exist'
      )
    })

    it('test when peer amount is greater than max peer amount', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await peer.getSignerSideQuote.call(
        MAX_SENDER_AMOUNT + 1,
        SIGNER_TOKEN,
        SENDER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if peer amount is greater than peer max amount'
      )
    })

    it('test when peer amount is 0', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await peer.getSignerSideQuote.call(
        0,
        SIGNER_TOKEN,
        SENDER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if peer amount is 0'
      )
    })

    it('test a successful call - getSignerSideQuote', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let val = await peer.getSignerSideQuote.call(
        1234,
        SIGNER_TOKEN,
        SENDER_TOKEN
      )
      let expectedValue = Math.floor((1234 * PRICE_COEF) / 10 ** EXP)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getSenderSideQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await peer.getSenderSideQuote.call(
        4312,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a peer does not exist'
      )
    })

    it('test when peer amount is not within acceptable value bounds', async () => {
      await peer.setRule(SIGNER_TOKEN, SENDER_TOKEN, 100, 1, 0)
      let val = await peer.getSenderSideQuote.call(
        0,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned peer amount is 0'
      )

      val = await peer.getSenderSideQuote.call(
        MAX_SENDER_AMOUNT + 1,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned greater than max peer amount'
      )
    })

    it('test a successful call - getSenderSideQuote', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let val = await peer.getSenderSideQuote.call(
        500,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      let expectedValue = Math.floor((500 * 10 ** EXP) / PRICE_COEF)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getMaxQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await peer.getMaxQuote.call(SIGNER_TOKEN, SENDER_TOKEN)
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
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await peer.getMaxQuote.call(SIGNER_TOKEN, SENDER_TOKEN)

      equal(
        val[0].toNumber(),
        MAX_SENDER_AMOUNT,
        'no quote should be available if a peer does not exist'
      )

      let expectedValue = Math.floor(
        (MAX_SENDER_AMOUNT * PRICE_COEF) / 10 ** EXP
      )
      equal(
        val[1].toNumber(),
        expectedValue,
        'no quote should be available if a peer does not exist'
      )
    })
  })

  describe('Test provideOrder', async () => {
    it('test if a rule does not exist', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: 555,
          token: SENDER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: 999,
          token: SIGNER_TOKEN,
        },
      })

      await reverted(
        peer.provideOrder(order, {
          from: notOwner,
        }),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('test if an order exceeds maximum amount', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: 555,
          token: SENDER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: MAX_SENDER_AMOUNT + 1,
          token: SIGNER_TOKEN,
        },
      })

      await reverted(
        peer.provideOrder(order, {
          from: notOwner,
        }),
        'AMOUNT_EXCEEDS_MAX'
      )
    })

    it('test if the sender is not empty and not the trade wallet', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let signerAmount = 100
      let senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SENDER_TOKEN,
        },
        sender: {
          wallet: notTradeWallet,
          param: senderAmount,
          token: SIGNER_TOKEN,
        },
      })

      await reverted(
        peer.provideOrder(order, {
          from: notOwner,
        }),
        'INVALID_SENDER_WALLET'
      )
    })

    it('test if order is not priced according to the rule', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const order = await orders.getOrder({
        signer: {
          param: 30,
          token: SENDER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: MAX_SENDER_AMOUNT,
          token: SIGNER_TOKEN,
        },
      })

      await reverted(
        peer.provideOrder(order, {
          from: notOwner,
        })
      )
    })

    it('test a successful transaction with integer values', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        100,
        EXP
      )

      let ruleBefore = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)

      let signerAmount = 100

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SENDER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: 100,
          token: SIGNER_TOKEN,
        },
      })

      await passes(
        //mock swapContract
        //test rule decrement
        peer.provideOrder(order, {
          from: notOwner,
        })
      )

      let ruleAfter = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - signerAmount,
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

    it('test a successful transaction with trade wallet as sender', async () => {
      await peer.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        100,
        EXP
      )

      let ruleBefore = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)

      let signerAmount = 100

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SENDER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: 100,
          token: SIGNER_TOKEN,
        },
      })

      await passes(
        //mock swapContract
        //test rule decrement
        peer.provideOrder(order, {
          from: notOwner,
        })
      )

      let ruleAfter = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - signerAmount,
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
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let ruleBefore = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)

      let signerAmount = 100
      let senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SENDER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: senderAmount,
          token: SIGNER_TOKEN,
        },
      })

      await passes(
        //mock swapContract
        //test rule decrement
        peer.provideOrder(order, {
          from: notOwner,
        })
      )

      let ruleAfter = await peer.rules.call(SIGNER_TOKEN, SENDER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - senderAmount,
        "rule's max peer amount was not decremented"
      )
    })
  })
})
