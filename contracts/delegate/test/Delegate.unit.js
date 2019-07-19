const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const FungibleToken = artifacts.require('FungibleToken')
const MockContract = artifacts.require('MockContract')
const abi = require('ethereumjs-abi')
const { equal, notEqual, passes, emitted } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

contract.only('Delegate Unit Tests', async accounts => {

  let delegate
  let mockSwap
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

  before('deploy Delegate', async () => {

    mockSwap = await MockContract.new()
    delegate = await Delegate.new(mockSwap.address)
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contract', async () => {
      let val = await delegate.swapContract.call();
      equal(val, mockSwap.address, 'swap address is incorrect');
    })
  })

  describe('Test setters', async () => {
    it('Test setSwapContract', async () => {
      let newSwap = await MockContract.new()
      await delegate.setSwapContract(newSwap.address)
      let val = await delegate.swapContract.call()
      notEqual(val, mockSwap.address, "the swap contract has not changed")
      equal(val, newSwap.address, "the swap contract has not changed to the right value")
    })

    it('Test setRule', async () => {
      let trx = await delegate.setRule(DELEGATE_TOKEN, CONSUMER_TOKEN, MAX_DELEGATE_AMOUNT, PRICE_COEF, EXP)

      //check if rule has been added
      let rule = await delegate.rules.call(DELEGATE_TOKEN, CONSUMER_TOKEN)
      equal(rule[0].toNumber(), MAX_DELEGATE_AMOUNT, "max delegate amount is incorrectly saved")
      equal(rule[1].toNumber(), PRICE_COEF, "price coef is incorrectly saved")
      equal(rule[2].toNumber(), EXP, "price exp is incorrectly saved")
      
      //check emitted event
      emitted(trx, 'SetRule', (e) => {
        return e.delegateToken === DELEGATE_TOKEN &&
        e.consumerToken === CONSUMER_TOKEN &&
        e.maxDelegateAmount.toNumber() === MAX_DELEGATE_AMOUNT &&
        e.priceCoef.toNumber() === PRICE_COEF &&
        e.priceExp.toNumber() === EXP
      })
    })

    it('Test unsetRule', async () => {
      let trx = await delegate.setRule(DELEGATE_TOKEN, CONSUMER_TOKEN, MAX_DELEGATE_AMOUNT, PRICE_COEF, EXP)

      //check emitted event
      emitted(trx, 'SetRule', (e) => {
        return e.delegateToken === DELEGATE_TOKEN &&
        e.consumerToken === CONSUMER_TOKEN &&
        e.maxDelegateAmount.toNumber() === MAX_DELEGATE_AMOUNT &&
        e.priceCoef.toNumber() === PRICE_COEF &&
        e.priceExp.toNumber() === EXP
      })

      trx = await delegate.unsetRule(DELEGATE_TOKEN, CONSUMER_TOKEN)

      //check that the rule has been removed
      let rule = await delegate.rules.call(DELEGATE_TOKEN, CONSUMER_TOKEN)
      equal(rule[0].toNumber(), 0, "max delgate amount is incorrectly saved")
      equal(rule[1].toNumber(), 0, "price coef is incorrectly saved")
      equal(rule[2].toNumber(), 0, "price exp is incorrectly saved")
      
      //check emitted event
      emitted(trx, 'UnsetRule', (e) => {
        return e.delegateToken === DELEGATE_TOKEN &&
        e.consumerToken === CONSUMER_TOKEN
      })
    })
  })

  describe('Test getBuyQuote', async () => {
    it('test when delegate does not exist', async () => {
    })

    it('test when delegate amount is greater than max delegate amount', async () => {
    })

    it('test when consumer amount is not an invalid price', async () => {
    })

    it('test a successful call', async () => {
    })
  })
})
