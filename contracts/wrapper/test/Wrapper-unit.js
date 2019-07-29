const Swap = artifacts.require('Swap')
const Wrapper = artifacts.require('Wrapper')
const WETH9 = artifacts.require('WETH9')
const MockContract = artifacts.require('MockContract')

const { equal, reverted, passes } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Wrapper Unit Tests', async accounts => {
  const mockToken = accounts[9]
  const r = web3.utils.asciiToHex('r')
  const s = web3.utils.asciiToHex('s')
  let mockSwap
  let mockWeth
  let wrapper
  let wethTemplate
  let weth_balance
  let swap_swapSimple

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockWeth() {
    mockWeth = await MockContract.new()

    wethTemplate = await WETH9.new()

    weth_balance = wethTemplate.contract.methods
      .balanceOf(EMPTY_ADDRESS)
      .encodeABI()

    //mock the weth.approve method
    let weth_approve = wethTemplate.contract.methods
      .approve(EMPTY_ADDRESS, 0)
      .encodeABI()
    await mockWeth.givenMethodReturnBool(weth_approve, true)

    //mock the weth.transferFrom method
    let weth_transferFrom = wethTemplate.contract.methods
      .transferFrom(EMPTY_ADDRESS, EMPTY_ADDRESS, 0)
      .encodeABI()
    await mockWeth.givenMethodReturnBool(weth_transferFrom, true)
  }

  async function setupMockSwap() {
    swapTemplate = await Swap.new()
    //mock the swap.swapSimple method
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
        27,
        r,
        s
      )
      .encodeABI()

    mockSwap = await MockContract.new()
  }

  before('deploy Wrapper', async () => {
    await setupMockWeth()
    await setupMockSwap()
    wrapper = await Wrapper.new(mockSwap.address, mockWeth.address)
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contract', async () => {
      let val = await wrapper.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test initial Weth Contract', async () => {
      let val = await wrapper.wethContract.call()
      equal(val, mockWeth.address, 'weth address is incorrect')
    })
  })

  describe('Test swapSimple', async () => {
    it('Test when taker token != weth contract address, ensure no unexpected ether sent', async () => {
      let nonTakerToken = mockToken
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
          27, //v
          r,
          s,
          { value: 2 }
        ),
        'VALUE_MUST_BE_ZERO'
      )
    })

    it('Test when taker token == weth contract address, ensure the taker wallet is unset', async () => {
      let mockTakerToken = mockToken
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
          27, //v
          r,
          s,
          { value: 2 }
        ),
        'TAKER_ADDRESS_MUST_BE_UNSET'
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
          27, //v
          r,
          s,
          { value: 2 }
        ),
        'VALUE_MUST_BE_SENT'
      )
    })

    it('Test when taker token == weth contract address, maker token address != weth contract address, and weth contact has a left over balance', async () => {
      let mockMakerToken = mockToken
      let takerAmount = 2

      //mock the weth.balance method
      await mockWeth.givenMethodReturnUint(weth_balance, 1)

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
          27, //v
          r,
          s,
          { value: takerAmount }
        ),
        'WETH_BALANCE_REMAINING'
      )
    })

    it.skip('Test when taker token == weth contract address, maker token address != weth contract address, and wrapper address has a left over balance', async () => {
      let mockMakerToken = mockToken
      let takerAmount = 2

      //mock the weth.balance method
      await mockWeth.givenMethodReturnUint(weth_balance, 0)

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
          27, //v
          r, 
          s,
          { value: takerAmount }
        ),
        'ETH_BALANCE_REMAINING'
      )

      //TODO: @dmosites I can't actually test this.
      //there are two reasons for this.
      //1. the balance on the wrapper contact is not account specific. The entire contract has a balance that is tracked amongst all users.
      //2. this unfortunately means there is also a security vulnerability: require(address(this).balance == 0, "ETH_BALANCE_REMAINING") if anybody sends
      //any amount of ETH or WETH to this contract outside of the swapSimple() method it will forever lock the contract. This is because the contract tries to keep
      //a balance of 0, but thats irrespective of what already exists within the contract.
    })

    it('Test when taker token == weth contract address, maker token address == weth contract address, and transaction is passes', async () => {
      let takerAmount = 2

      //mock the weth.balance method
      await mockWeth.givenMethodReturnUint(weth_balance, 0)

      await passes(
        wrapper.swapSimple(
          0, //nonce
          0, //expiry
          EMPTY_ADDRESS, //maker wallet
          0, //maker amount
          mockWeth.address, //maker token
          EMPTY_ADDRESS, //taker wallet
          takerAmount, //taker amount
          mockWeth.address, //taker token
          27, //v
          r, 
          s,
          { value: takerAmount }
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

    it('Test when taker token == weth contract address, maker token address != weth contract address, and transaction is passes', async () => {
      let takerAmount = 2

      //mock the weth.balance method
      await mockWeth.givenMethodReturnUint(weth_balance, 0)

      let notWethContract = mockToken
      await passes(
        wrapper.swapSimple(
          0, //nonce
          0, //expiry
          EMPTY_ADDRESS, //maker wallet
          0, //maker amount
          notWethContract, //maker token
          EMPTY_ADDRESS, //taker wallet
          takerAmount, //taker amount
          mockWeth.address, //taker token
          27, //v
          r,
          s,
          { value: takerAmount }
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
