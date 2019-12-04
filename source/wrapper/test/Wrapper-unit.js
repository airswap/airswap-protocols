const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Wrapper = artifacts.require('Wrapper')
const WETH9 = artifacts.require('WETH9')
const FungibleToken = artifacts.require('FungibleToken')
const MockContract = artifacts.require('MockContract')

const { equal, reverted, passes } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const {
  EMPTY_ADDRESS,
  GANACHE_PROVIDER,
} = require('@airswap/order-utils').constants
const { orders, signatures } = require('@airswap/order-utils')

contract('Wrapper Unit Tests', async accounts => {
  const senderParam = 2
  const mockToken = accounts[9]
  const mockSender = accounts[8]
  const mockSigner = accounts[7]
  let mockSwap
  let mockSwapAddress
  let mockWeth
  let mockFT
  let wrapper
  let wethTemplate
  let fungibleTokenTemplate
  let weth_balance
  let mock_transfer
  let swap
  let snapshotId

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  async function setupMockWeth() {
    mockWeth = await MockContract.new()

    wethTemplate = await WETH9.new()

    weth_balance = wethTemplate.contract.methods
      .balanceOf(EMPTY_ADDRESS)
      .encodeABI()

    //mock the weth.approve method
    const weth_approve = wethTemplate.contract.methods
      .approve(EMPTY_ADDRESS, 0)
      .encodeABI()
    await mockWeth.givenMethodReturnBool(weth_approve, true)

    // mock the weth.allowance method
    const weth_allowance = wethTemplate.contract.methods
      .allowance(EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockWeth.givenMethodReturnUint(weth_allowance, 100000)

    // mock the weth.balanceOf method
    const weth_wrapper_balance = wethTemplate.contract.methods
      .balanceOf(EMPTY_ADDRESS)
      .encodeABI()
    await mockWeth.givenMethodReturnUint(weth_wrapper_balance, 100000)

    //mock the weth.transfer method
    const weth_transfer = wethTemplate.contract.methods
      .transfer(EMPTY_ADDRESS, 0)
      .encodeABI()
    await mockWeth.givenMethodReturnBool(weth_transfer, true)

    //mock the weth.transferFrom method
    const weth_transferFrom = wethTemplate.contract.methods
      .transferFrom(EMPTY_ADDRESS, EMPTY_ADDRESS, 0)
      .encodeABI()
    await mockWeth.givenMethodReturnBool(weth_transferFrom, true)
  }

  async function setupMockSwap() {
    const types = await Types.new()
    await Swap.link('Types', types.address)
    const swapTemplate = await Swap.new()
    //mock the swap.swap method
    const order = await orders.getOrder({})

    swap = swapTemplate.contract.methods.swap(order).encodeABI()

    mockSwap = await MockContract.new()
    mockSwapAddress = mockSwap.address

    await orders.setVerifyingContract(mockSwap.address)
  }

  async function setupMockFungibleToken() {
    mockFT = await MockContract.new()
    fungibleTokenTemplate = await FungibleToken.new()

    mock_transfer = fungibleTokenTemplate.contract.methods
      .transfer(EMPTY_ADDRESS, 0)
      .encodeABI()
    await mockFT.givenMethodReturnBool(mock_transfer, true)
  }

  before('deploy Wrapper', async () => {
    await setupMockWeth()
    await setupMockSwap()
    await setupMockFungibleToken()
    wrapper = await Wrapper.new(mockSwap.address, mockWeth.address)
  })

  describe('Test initial values', async () => {
    it('Test initial Swap Contract', async () => {
      const val = await wrapper.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test initial Weth Contract', async () => {
      const val = await wrapper.wethContract.call()
      equal(val, mockWeth.address, 'weth address is incorrect')
    })
  })

  describe('Test wrapped swap', async () => {
    it('Test fallback function revert', async () => {
      await reverted(
        web3.eth.sendTransaction({
          from: mockSender,
          to: wrapper.address,
          value: 1,
        }),
        'DO_NOT_SEND_ETHER'
      )
    })

    it('Test when sender token != weth, ensure no unexpected ether sent', async () => {
      const nonSenderToken = mockToken
      const senderToken = mockToken

      const order = await orders.getOrder({
        sender: {
          wallet: mockSender,
          token: nonSenderToken,
        },
        signer: {
          wallet: mockSigner,
          token: senderToken,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        mockSigner,
        mockSwapAddress,
        GANACHE_PROVIDER
      )

      await reverted(
        wrapper.swap(order, {
          from: mockSender,
          value: 2,
        }),
        'VALUE_MUST_BE_ZERO'
      )
    })

    it('Test when sender token == weth, ensure the sender amount matches sent ether', async () => {
      const order = await orders.getOrder({
        sender: {
          wallet: mockSender,
          param: 1,
          token: mockWeth.address,
        },
        signer: {
          wallet: mockSigner,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        mockSigner,
        mockSwapAddress,
        GANACHE_PROVIDER
      )

      await reverted(
        wrapper.swap(order, {
          value: 2,
          from: mockSender,
        }),
        'VALUE_MUST_BE_SENT'
      )
    })

    it('Test when sender token == weth, signer token == weth, and the transaction passes', async () => {
      //mock the weth.balance method
      await mockWeth.givenMethodReturnUint(weth_balance, 0)
      const order = await orders.getOrder({
        signer: {
          wallet: mockSigner,
          token: mockWeth.address,
        },
        sender: {
          wallet: mockSender,
          param: senderParam,
          token: mockWeth.address,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        mockSigner,
        mockSwapAddress,
        GANACHE_PROVIDER
      )

      await passes(
        wrapper.swap(order, {
          value: senderParam,
          from: mockSender,
        })
      )

      //check if swap() was called
      const invocationCount = await mockSwap.invocationCountForMethod.call(swap)
      equal(
        invocationCount.toNumber(),
        1,
        'swap function was not called the expected number of times'
      )
    })

    it('Test when sender token == weth, signer token != weth, and the transaction passes', async () => {
      const notWethContract = mockFT.address

      const order = await orders.getOrder({
        signer: {
          wallet: mockSigner,
          token: notWethContract,
        },
        sender: {
          wallet: mockSender,
          param: senderParam,
          token: mockWeth.address,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        mockSigner,
        mockSwapAddress,
        GANACHE_PROVIDER
      )

      await passes(
        wrapper.swap(order, {
          value: senderParam,
          from: mockSender,
        })
      )

      //check if swap() was called
      const invocationCount = await mockSwap.invocationCountForMethod.call(swap)
      equal(
        invocationCount.toNumber(),
        1,
        'swap function was not called the expected number of times'
      )
    })

    /**
     * Scenario for failure: The sender sends in WETH which means that when the trade succeeds the sender wallet
     * is the wrapper contract and the swap is between the signer token and the wrapper contract. The token needs
     * to be returned to the sender. Certain ERC20 contract return a boolean instead of reverting on failure and
     * thus if the final transfer from wrapper contract to signer fails the overall transaction should revert to
     * ensure no tokens are left in the wrapper contract.
     */
    it('Test when sender token == weth, signer token != weth, and the wrapper token transfer fails', async () => {
      await mockFT.givenMethodReturnBool(mock_transfer, false)
      const notWethContract = mockFT.address

      const order = await orders.getOrder({
        signer: {
          wallet: mockSigner,
          token: notWethContract,
        },
        sender: {
          param: senderParam,
          token: mockWeth.address,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        mockSigner,
        mockSwapAddress,
        GANACHE_PROVIDER
      )

      await reverted(
        wrapper.swap(order, {
          value: senderParam,
        })
      )

      //check if swap() was called
      const invocationCount = await mockSwap.invocationCountForMethod.call(swap)
      equal(
        invocationCount.toNumber(),
        0,
        'swap function was not called the expected number of times'
      )
    })
  })

  describe('Test sending two ERC20s', async () => {
    it('Test when sender token == non weth erc20, signer token == non weth erc20 but msg.sender is not senderwallet', async () => {
      const nonMockSender = accounts[7]
      const notWethContract = mockFT.address

      const order = await orders.getOrder({
        sender: {
          wallet: nonMockSender,
          param: 1,
          token: notWethContract,
        },
        signer: {
          wallet: mockSigner,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        mockSigner,
        mockSwapAddress,
        GANACHE_PROVIDER
      )

      await reverted(
        wrapper.swap(order, {
          value: 0,
          from: mockSender,
        }),
        'MSG_SENDER_MUST_BE_ORDER_SENDER'
      )
    })

    it('Test when sender token == non weth erc20, signer token == non weth erc20, and the transaction passes', async () => {
      const notWethContract = mockFT.address

      const order = await orders.getOrder({
        signer: {
          token: notWethContract,
          wallet: mockSigner,
        },
        sender: {
          wallet: mockSender,
          param: senderParam,
          token: notWethContract,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        mockSigner,
        mockSwapAddress,
        GANACHE_PROVIDER
      )

      await passes(
        wrapper.swap(order, {
          value: 0,
          from: mockSender,
        })
      )

      //check if swap() was called
      const invocationCount = await mockSwap.invocationCountForMethod.call(swap)
      equal(
        invocationCount.toNumber(),
        1,
        'swap function was not called the expected number of times'
      )
    })
  })
})
