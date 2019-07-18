const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const FungibleToken = artifacts.require('FungibleToken')
const MockContract = artifacts.require('MockContract')
const abi = require('ethereumjs-abi')
const { equal, notEqual, passes } = require('@airswap/test-utils').assert
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

    })
  })
})
