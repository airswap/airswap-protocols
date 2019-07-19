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
      let delegateToken = accounts[9]
      let consumerToken = accounts[8]
      let maxDelegateAmount = 12345
      let priceCoef = 4321
      let exp = 2
      let trx = await delegate.setRule(delegateToken, consumerToken, maxDelegateAmount, priceCoef, exp)

      //check if rule has been added
      let rule = await delegate.rules.call(delegateToken, consumerToken)
      equal(rule[0].toNumber(), maxDelegateAmount, "max delegate amount is incorrectly saved")
      equal(rule[1].toNumber(), priceCoef, "price coef is incorrectly saved")
      equal(rule[2].toNumber(), exp, "price exp is incorrectly saved")
      
      //check emitted event
      emitted(trx, 'SetRule', (e) => {
        return e.delegateToken === delegateToken &&
        e.consumerToken === consumerToken &&
        e.maxDelegateAmount.toNumber() === maxDelegateAmount &&
        e.priceCoef.toNumber() === priceCoef &&
        e.priceExp.toNumber() === exp
      })
    })
  })
})
