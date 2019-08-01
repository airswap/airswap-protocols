/* global artifacts, contract, web3*/
const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const MockContract = artifacts.require('MockContract')
const {
  equal,
  notEqual,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

contract('Delegate Unit Tests', async accounts => {
  const owner = accounts[0]
  const notOwner = accounts[2]
  let delegate
  let mockSwap
  let snapshotId
  let swap_swapSimple
  const DELEGATE_TOKEN = accounts[9]
  const CONSUMER_TOKEN = accounts[8]
  const MAX_DELEGATE_AMOUNT = 12345
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
    swap_swapSimple = swapTemplate.contract.methods
      .swapSimple(
        0,
        0,
        EMPTY_ADDRESS,
        0,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        0,
        EMPTY_ADDRESS,
        8,
        web3.utils.asciiToHex('r'),
        web3.utils.asciiToHex('s')
      )
      .encodeABI()

    mockSwap = await MockContract.new()
  }

  before('deploy Delegate', async () => {
    await setupMockSwap()
    delegate = await Delegate.new(mockSwap.address)
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contract', async () => {
      let val = await delegate.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })
  })

  describe('Test setters', async () => {
    it('Test setSwapContract permissions', async () => {
      let newSwap = await MockContract.new()
      await reverted(
        delegate.setSwapContract(newSwap.address, { from: notOwner })
      )
      await passes(delegate.setSwapContract(newSwap.address, { from: owner }))
    })

    it('Test setSwapContract', async () => {
      let newSwap = await MockContract.new()
      await delegate.setSwapContract(newSwap.address)
      let val = await delegate.swapContract.call()
      notEqual(val, mockSwap.address, 'the swap contract has not changed')
      equal(
        val,
        newSwap.address,
        'the swap contract has not changed to the right value'
      )
    })

    it('Test setRule permissions', async () => {
      await reverted(
        delegate.setRule(
          DELEGATE_TOKEN,
          CONSUMER_TOKEN,
          MAX_DELEGATE_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: notOwner }
        )
      )

      await passes(
        delegate.setRule(
          DELEGATE_TOKEN,
          CONSUMER_TOKEN,
          MAX_DELEGATE_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: owner }
        )
      )
    })

    it('Test setRule', async () => {
      let trx = await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //check if rule has been added
      let rule = await delegate.rules.call(DELEGATE_TOKEN, CONSUMER_TOKEN)
      equal(
        rule[0].toNumber(),
        MAX_DELEGATE_AMOUNT,
        'max delegate amount is incorrectly saved'
      )
      equal(rule[1].toNumber(), PRICE_COEF, 'price coef is incorrectly saved')
      equal(rule[2].toNumber(), EXP, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'SetRule', e => {
        return (
          e.delegateToken === DELEGATE_TOKEN &&
          e.consumerToken === CONSUMER_TOKEN &&
          e.maxDelegateAmount.toNumber() === MAX_DELEGATE_AMOUNT &&
          e.priceCoef.toNumber() === PRICE_COEF &&
          e.priceExp.toNumber() === EXP
        )
      })
    })

    it('Test unsetRule permissions', async () => {
      await reverted(
        delegate.unsetRule(DELEGATE_TOKEN, CONSUMER_TOKEN, { from: notOwner })
      )
      await passes(
        delegate.unsetRule(DELEGATE_TOKEN, CONSUMER_TOKEN, { from: owner })
      )
    })

    it('Test unsetRule', async () => {
      let trx = await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //ensure rule has been added
      let rule_before = await delegate.rules.call(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN
      )
      equal(
        rule_before[0].toNumber(),
        MAX_DELEGATE_AMOUNT,
        'max delegate amount is incorrectly saved'
      )

      trx = await delegate.unsetRule(DELEGATE_TOKEN, CONSUMER_TOKEN)

      //check that the rule has been removed
      let rule_after = await delegate.rules.call(DELEGATE_TOKEN, CONSUMER_TOKEN)
      equal(
        rule_after[0].toNumber(),
        0,
        'max delgate amount is incorrectly saved'
      )
      equal(rule_after[1].toNumber(), 0, 'price coef is incorrectly saved')
      equal(rule_after[2].toNumber(), 0, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'UnsetRule', e => {
        return (
          e.delegateToken === DELEGATE_TOKEN &&
          e.consumerToken === CONSUMER_TOKEN
        )
      })
    })
  })

  describe('Test getBuyQuote', async () => {
    it('test when rule does not exist', async () => {
      const NON_EXISTENT_DELEGATE_TOKEN = accounts[7]
      let val = await delegate.getBuyQuote.call(
        1234,
        NON_EXISTENT_DELEGATE_TOKEN,
        CONSUMER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a delegate does not exist'
      )
    })

    it('test when delegate amount is greater than max delegate amount', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await delegate.getBuyQuote.call(
        MAX_DELEGATE_AMOUNT + 1,
        DELEGATE_TOKEN,
        CONSUMER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if delegate amount is greater than delegate max amount'
      )
    })

    it('test when delegate amount is 0', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await delegate.getBuyQuote.call(
        0,
        DELEGATE_TOKEN,
        CONSUMER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if delegate amount is 0'
      )
    })

    it.skip('test a successful call', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await delegate.getBuyQuote.call(
        1234,
        DELEGATE_TOKEN,
        CONSUMER_TOKEN
      )
      //TODO: @dmosites should the getBuyQuote() return with an exponent or a whole number?
      //1234 * PRICE_COEF * 10^(-EXP)
      equal(val.toNumber(), 5332114, 'there should be a quote available')
    })
  })

  describe('Test getSellQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await delegate.getSellQuote.call(
        4312,
        CONSUMER_TOKEN,
        DELEGATE_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a delegate does not exist'
      )
    })

    it('test when delegate amount is not within acceptable value bounds', async () => {
      await delegate.setRule(DELEGATE_TOKEN, CONSUMER_TOKEN, 100, 1, 0)
      let val = await delegate.getSellQuote.call(
        0,
        CONSUMER_TOKEN,
        DELEGATE_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned delegate amount is 0'
      )

      val = await delegate.getSellQuote.call(
        MAX_DELEGATE_AMOUNT + 1,
        CONSUMER_TOKEN,
        DELEGATE_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned greater than max delegate amount'
      )
    })

    it.skip('test a successful call', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await delegate.getSellQuote.call(
        500,
        CONSUMER_TOKEN,
        DELEGATE_TOKEN
      )
      //TODO: @dmosites should the getSellQuote() return with an exponent or a whole number?
      //500 * (10 ^ EXP) / PRICE_COEF
      equal(val.toNumber(), 1157, 'there should be a quote available')
    })
  })

  describe('Test getMaxQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await delegate.getMaxQuote(DELEGATE_TOKEN, CONSUMER_TOKEN)
      equal(
        val[0].toNumber(),
        0,
        'no quote should be available if a delegate does not exist'
      )
      equal(
        val[1].toNumber(),
        0,
        'no quote should be available if a delegate does not exist'
      )
    })

    it.skip('test a successful call', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )
      let val = await delegate.getMaxQuote(DELEGATE_TOKEN, CONSUMER_TOKEN)
      //TODO: @dmosites should the getMaxQuote() return with an exponent or a whole number?
      //MAX_DELEGATE_AMOUNT * PRICE_COEF / (10 ^ EXP)
      equal(
        val[0].toNumber(),
        MAX_DELEGATE_AMOUNT,
        'no quote should be available if a delegate does not exist'
      )
      equal(
        val[1].toNumber(),
        53342745,
        'no quote should be available if a delegate does not exist'
      )
    })
  })

  describe('Test provideOrder', async () => {
    it('test if a rule does not exist', async () => {
      await reverted(
        delegate.provideOrder(
          1,
          2,
          EMPTY_ADDRESS,
          555,
          CONSUMER_TOKEN,
          EMPTY_ADDRESS,
          999,
          DELEGATE_TOKEN,
          5,
          web3.utils.asciiToHex('r'),
          web3.utils.asciiToHex('s')
        ),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('test if an order exceeds maximum amount', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )
      await reverted(
        delegate.provideOrder(
          1,
          2,
          EMPTY_ADDRESS,
          555,
          CONSUMER_TOKEN,
          EMPTY_ADDRESS,
          MAX_DELEGATE_AMOUNT + 1,
          DELEGATE_TOKEN,
          5,
          web3.utils.asciiToHex('r'),
          web3.utils.asciiToHex('s')
        ),
        'AMOUNT_EXCEEDS_MAX'
      )
    })

    it('test if order is priced according to the rule', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        PRICE_COEF,
        EXP
      )
      await reverted(
        delegate.provideOrder(
          1,
          2,
          EMPTY_ADDRESS,
          30,
          CONSUMER_TOKEN,
          EMPTY_ADDRESS,
          MAX_DELEGATE_AMOUNT,
          DELEGATE_TOKEN,
          100,
          web3.utils.asciiToHex('r'),
          web3.utils.asciiToHex('s')
        ),
        'PRICE_INCORRECT'
      )
    })

    it('test a successful transaction with integer values', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        100,
        EXP
      )

      let rule_before = await delegate.rules.call(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN
      )

      let consumer_amount = 100
      await passes(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(
          1, //nonce
          2, //expiry
          EMPTY_ADDRESS, //consumerWallet
          consumer_amount, //consumerAmount
          CONSUMER_TOKEN, //consumerToken
          EMPTY_ADDRESS, //delegateWallet
          100, //delegateAmount
          DELEGATE_TOKEN, //delegateToken
          8, //v
          web3.utils.asciiToHex('r'), //r
          web3.utils.asciiToHex('s') //s
        )
      )

      let rule_after = await delegate.rules.call(DELEGATE_TOKEN, CONSUMER_TOKEN)
      equal(
        rule_after[0].toNumber(),
        rule_before[0].toNumber() - consumer_amount,
        "rule's max delegate amount was not decremented"
      )

      //check if swap_swapSimple() was called
      let invocationCount = await mockSwap.invocationCountForMethod.call(
        swap_swapSimple
      )
      equal(
        invocationCount,
        1,
        "swap contact's swap.swapSimple was not called the expected number of times"
      )
    })

    it.skip('test a successful transaction with decimal values', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        4321,
        EXP
      )

      let rule_before = await delegate.rules.call(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN
      )

      let consumer_amount = 100
      await passes(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(
          1, //nonce
          2, //expiry
          EMPTY_ADDRESS, //consumerWallet
          consumer_amount, //consumerAmount
          CONSUMER_TOKEN, //consumerToken
          EMPTY_ADDRESS, //delegateWallet
          231, //delegateAmount
          DELEGATE_TOKEN, //delegateToken
          8, //v
          web3.utils.asciiToHex('r'), //r
          web3.utils.asciiToHex('s') //s
        )
      )

      let rule_after = await delegate.rules.call(DELEGATE_TOKEN, CONSUMER_TOKEN)
      equal(
        rule_after[0].toNumber(),
        rule_before[0].toNumber() - consumer_amount,
        "rule's max delegate amount was not decremented"
      )
    })
  })

  describe('Test provideUnsignedOrder', async () => {
    it('test provideUnsignedOrder call', async () => {
      await delegate.setRule(
        DELEGATE_TOKEN,
        CONSUMER_TOKEN,
        MAX_DELEGATE_AMOUNT,
        100,
        EXP
      )

      let consumer_amount = 100
      await passes(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(
          1, //nonce
          2, //expiry
          EMPTY_ADDRESS, //consumerWallet
          consumer_amount, //consumerAmount
          CONSUMER_TOKEN, //consumerToken
          EMPTY_ADDRESS, //delegateWallet
          100, //delegateAmount
          DELEGATE_TOKEN, //delegateToken
          8, //v
          web3.utils.asciiToHex('r'), //r
          web3.utils.asciiToHex('s') //s
        )
      )

      //check if swap_swapSimple() was called
      let invocationCount = await mockSwap.invocationCountForMethod.call(
        swap_swapSimple
      )
      equal(
        invocationCount.toNumber(),
        1,
        "swap contact's swap.swapSimple was not called the expected number of times"
      )
    })
  })
})
