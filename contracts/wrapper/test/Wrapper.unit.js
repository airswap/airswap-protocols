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
  let wethTemplate

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockWeth() {
    mockWeth = await MockContract.new()

    wethTemplate = await WETH9.new();

    //mock the weth.approve method
    let weth_approve = wethTemplate.contract.methods.approve(EMPTY_ADDRESS, 0).encodeABI();
    mockWeth.givenMethodReturnBool(weth_approve, true)
  }

  before('deploy Wrapper', async () => {
    mockSwap = await MockContract.new()
    await setupMockWeth()
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
      let mockTakerToken = accounts[9]
      await reverted(
        wrapper.swapSimple(
          0, //nonce
          0, //expiry
          EMPTY_ADDRESS, //maker wallet
          0, //maker amount
          EMPTY_ADDRESS, //maker token
          mockTakerToken, //taker wallet
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

    it('Test when taker token == weth contract address, maker token address != weth contract address, and weth contact has a left over balance', async () => {
      let mockMakerToken = accounts[9]
      let takerAmount = 2

      //mock the weth.balance method
      let weth_balance = wethTemplate.contract.methods.balanceOf(EMPTY_ADDRESS).encodeABI();
      mockWeth.givenMethodReturnUint(weth_balance, 1)

      await reverted(
        wrapper.swapSimple(
          0, //nonce
          0, //expiry
          EMPTY_ADDRESS, //maker wallet
          0, //maker amount
          mockMakerToken, //maker token
          EMPTY_ADDRESS, //taker wallet
          takerAmount, //taker amount
          mockWeth.address, //taker token
          8, //v
          web3.utils.asciiToHex('r'), //r 
          web3.utils.asciiToHex('s'), //s
          { value: takerAmount }
        ),
        "WETH_BALANCE_REMAINING"
      )
    })

    it.skip('Test when taker token == weth contract address, maker token address != weth contract address, and wrapper address has a left over balance', async () => {
      let mockMakerToken = accounts[9]
      let takerAmount = 2

      //mock the weth.balance method
      let weth_balance = wethTemplate.contract.methods.balanceOf(EMPTY_ADDRESS).encodeABI();
      mockWeth.givenMethodReturnUint(weth_balance, 0)

      await reverted(
        wrapper.swapSimple(
          0, //nonce
          0, //expiry
          EMPTY_ADDRESS, //maker wallet
          0, //maker amount
          mockMakerToken, //maker token
          EMPTY_ADDRESS, //taker wallet
          takerAmount, //taker amount
          mockWeth.address, //taker token
          8, //v
          web3.utils.asciiToHex('r'), //r 
          web3.utils.asciiToHex('s'), //s
          { value: takerAmount }
        ),
        "ETH_BALANCE_REMAINING"
      )

      //TODO: @dmosites I can't actually test this.
      //there are two reasons for this.
      //1. the balance on the wrapper contact is not account specific. The entire contract has a balance that is tracked amongst all users.
      //2. this unfortunately means there is also a security vulnerability: require(address(this).balance == 0, "ETH_BALANCE_REMAINING") if anybody sends
      //any amount to this contract outside of the swapSimple() method it will forever lock the contract.
      //Furthermore, it's also possible to lock the contract by sending WETH to the contract.
    })
  })
})
