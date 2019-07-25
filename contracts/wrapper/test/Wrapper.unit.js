const Swap = artifacts.require('Swap')
const Wrapper = artifacts.require('Wrapper')
const WETH9 = artifacts.require('WETH9')
const MockContract = artifacts.require('MockContract')

const { equal, reverted, emitted, passes } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot, getTimestampPlusDays } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

contract.only('Wrapper Unit Tests', async (accounts) => {

  let mockSwap
  let mockWeth
  let wrapper

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('deploy Wrapper', async () => {
    mockSwap = await MockContract.new()
    mockWeth = await MockContract.new()
    wrapper = await Wrapper.new(mockSwap.address, mockWeth.address)
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contract', async () => {
      let val = await wrapper.swapContract.call()
      equal(val, mockSwap.address, "swap address is incorrect")
    })

    it('Test initial Weth Contract', async () => {
      let val = await wrapper.wethContract.call()
      equal(val, mockWeth.address, "weth address is incorrect")
    })
  })

  describe('Test swapSimple', async () => {
    it('Test when taker token != weth contract address, ensure no unexpected ether sent', async () => {
      let nonTakerToken = accounts[9]
      await reverted(
        wrapper.swapSimple(
          0, //nonce
          0, //expiry
          EMPTY_ADDRESS, //maker wallet
          0, //maker amount
          EMPTY_ADDRESS, //maker token
          EMPTY_ADDRESS, //taker wallet
          0, //taker amount
          nonTakerToken, //taker token
          8, //v
          web3.utils.asciiToHex('r'), //r 
          web3.utils.asciiToHex('s'), //s
          { value: 2 }
        ),
        "VALUE_MUST_BE_ZERO"
      )
    })

    it('Test when taker token == weth contract address, ensure the taker wallet is unset', async () => {
      let mockMakerToken = accounts[9]
      await reverted(
        wrapper.swapSimple(
          0, //nonce
          0, //expiry
          EMPTY_ADDRESS, //maker wallet
          0, //maker amount
          EMPTY_ADDRESS, //maker token
          mockMakerToken, //taker wallet
          0, //taker amount
          mockWeth.address, //taker token
          8, //v
          web3.utils.asciiToHex('r'), //r 
          web3.utils.asciiToHex('s'), //s
          { value: 2 }
        ),
        "TAKER_ADDRESS_MUST_BE_UNSET"
      )
    })

    it('Test when taker token == weth contract address, ensure the taker amount matches sent ether', async () => {
      let mockMakerToken = accounts[9]
      await reverted(
        wrapper.swapSimple(
          0, //nonce
          0, //expiry
          EMPTY_ADDRESS, //maker wallet
          0, //maker amount
          EMPTY_ADDRESS, //maker token
          EMPTY_ADDRESS, //taker wallet
          1, //taker amount
          mockWeth.address, //taker token
          8, //v
          web3.utils.asciiToHex('r'), //r 
          web3.utils.asciiToHex('s'), //s
          { value: 2 }
        ),
        "VALUE_MUST_BE_SENT"
      )
    })
  })
})
