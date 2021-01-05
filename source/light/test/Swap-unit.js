const ethers = require('ethers')
const {
  time: { takeSnapshot, revertToSnapshot },
  assert: { emitted, reverted, notEmitted, equal },
} = require('@airswap/test-utils')
const { ADDRESS_ZERO, SECONDS_IN_DAY } = require('@airswap/constants')

const { signOrder } = require('./utils')

const Swap = artifacts.require('Swap')
const IERC20 = artifacts.require('IERC20')
const MockContract = artifacts.require('MockContract')

const emptySignature = web3.utils.randomHex(65)
const ERC20Interface = new ethers.utils.Interface(IERC20.abi)
const encodeERC20Call = (name, args) =>
  ERC20Interface.functions[name].encode(args)

function createOrder({
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  nonce = Date.now(),
  sender = ADDRESS_ZERO,
  signerToken = ADDRESS_ZERO,
  senderToken = ADDRESS_ZERO,
  signerAmount = 0,
  senderAmount = 0,
  signature = emptySignature,
}) {
  return {
    expiry,
    nonce,
    sender,
    signerToken,
    senderToken,
    signerAmount,
    senderAmount,
    signature,
  }
}

function orderToParams(order) {
  return [
    order.nonce,
    order.expiry,
    order.signerToken,
    order.signerAmount,
    order.senderToken,
    order.senderAmount,
    order.signature,
  ]
}

contract('Swap Light Unit Tests', async accounts => {
  const mockSender = accounts[1]
  const mockSigner = accounts[2]

  let snapshotId
  let swap
  let mockSignerToken
  let mockSenderToken

  const createOrderWithMockTokens = order =>
    createOrder({
      ...order,
      signerToken: mockSignerToken.address,
      senderToken: mockSenderToken.address,
    })

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('deploy Swap', async () => {
    swap = await Swap.new()
    mockSignerToken = await MockContract.new()
    mockSenderToken = await MockContract.new()
  })

  describe('Test swap', async () => {
    it('test transfers', async () => {
      const order = createOrderWithMockTokens({
        senderAmount: 1,
        signerAmount: 1,
        sender: mockSender,
      })
      const signedOrder = await signOrder(order, mockSigner, swap.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      const tx = await swap.swap(...orderToParams(signedOrder), {
        from: mockSender,
      })

      emitted(tx, 'Swap', e => {
        return (
          e.nonce.toNumber() === order.nonce &&
          e.signerWallet === mockSigner &&
          e.senderWallet === order.sender &&
          e.signerToken === order.signerToken &&
          e.senderToken === order.senderToken &&
          e.signerAmount.toNumber() === order.signerAmount &&
          e.senderAmount.toNumber() === order.senderAmount
        )
      })

      const senderTransferData = encodeERC20Call('transferFrom', [
        mockSender,
        mockSigner,
        1,
      ])
      const signerTransferData = encodeERC20Call('transferFrom', [
        mockSigner,
        mockSender,
        1,
      ])

      const senderTransferCalls = await mockSenderToken.invocationCountForCalldata.call(
        senderTransferData
      )
      const signerTransferCalls = await mockSignerToken.invocationCountForCalldata.call(
        signerTransferData
      )

      equal(senderTransferCalls.toNumber(), 1)
      equal(signerTransferCalls.toNumber(), 1)
    })

    it('test when order is expired', async () => {
      const order = createOrder({
        expiry: 0,
      })

      await reverted(swap.swap(...orderToParams(order)), 'ORDER_EXPIRED')
    })

    it('test when order nonce is too low', async () => {
      const order = createOrderWithMockTokens({
        nonce: 0,
        signerAmount: 200,
        senderAmount: 200,
        sender: mockSender,
      })

      const signedOrder = await signOrder(order, mockSigner, swap.address)

      await swap.cancelUpTo(5, { from: mockSigner })

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)
      await reverted(
        swap.swap(...orderToParams(signedOrder), {
          from: mockSender,
        }),
        'NONCE_TOO_LOW'
      )
    })

    it('test when nonce has already been used', async () => {
      const order = createOrderWithMockTokens({
        nonce: 0,
        signerAmount: 200,
        senderAmount: 200,
        sender: mockSender,
      })

      const signedOrder = await signOrder(order, mockSigner, swap.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      await swap.swap(...orderToParams(signedOrder), { from: mockSender })
      await reverted(
        swap.swap(...orderToParams(signedOrder), { from: mockSender }),
        'NONCE_ALREADY_USED'
      )
    })

    it('test when nonce has been cancelled', async () => {
      await swap.cancel([0], { from: mockSigner })
      const order = createOrderWithMockTokens({
        nonce: 0,
        signerAmount: 200,
        senderAmount: 200,
        sender: mockSender,
      })

      const signedOrder = await signOrder(order, mockSigner, swap.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      await reverted(
        swap.swap(...orderToParams(signedOrder), { from: mockSender }),
        'NONCE_ALREADY_USED'
      )
    })
  })

  describe('Test cancel', async () => {
    it('test cancellation with no items', async () => {
      const trx = await swap.cancel([], { from: mockSigner })
      await notEmitted(trx, 'Cancel')
    })

    it('test cancellation with duplicated items', async () => {
      const trx = await swap.cancel([1, 1], { from: mockSigner })
      await emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 1 && e.signerWallet === mockSigner
      })

      //ensure the value was set
      const val = await swap.nonceUsed.call(mockSigner, 1)
      equal(val, true)
    })

    it('test cancellation of same item twice', async () => {
      const trx = await swap.cancel([1], { from: mockSigner })
      await emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 1 && e.signerWallet === mockSigner
      })
      const trx2 = await swap.cancel([1], { from: mockSigner })
      await notEmitted(trx2, 'Cancel')

      //ensure the value was set
      const val = await swap.nonceUsed.call(mockSigner, 1)
      equal(val, true)
    })

    it('test cancellation with one item', async () => {
      const trx = await swap.cancel([6], { from: mockSigner })

      //ensure transaction was emitted
      await emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 6 && e.signerWallet === mockSigner
      })

      //ensure the value was set
      const val = await swap.nonceUsed.call(mockSigner, 6)
      equal(val, true)
    })

    it('test an array of nonces, ensure the cancellation of only those orders', async () => {
      await swap.cancel([1, 2, 4, 6], { from: mockSigner })
      let val
      val = await swap.nonceUsed.call(mockSigner, 1)
      equal(val, true)
      val = await swap.nonceUsed.call(mockSigner, 2)
      equal(val, true)
      val = await swap.nonceUsed.call(mockSigner, 3)
      equal(val, false)
      val = await swap.nonceUsed.call(mockSigner, 4)
      equal(val, true)
      val = await swap.nonceUsed.call(mockSigner, 5)
      equal(val, false)
      val = await swap.nonceUsed.call(mockSigner, 6)
      equal(val, true)
    })
  })

  describe('Test cancelUpTo functionality', async () => {
    it('test that given a minimum nonce for a signer is set', async () => {
      const minNonceForSigner = await swap.signerMinimumNonce.call(mockSigner)
      equal(minNonceForSigner, 0, 'mock signer should have min nonce of 0')

      const trx = await swap.cancelUpTo(5, { from: mockSigner })

      const newNonceForSigner = await swap.signerMinimumNonce.call(mockSigner)
      equal(newNonceForSigner, 5, 'mock signer should have a min nonce of 5')

      emitted(trx, 'CancelUpTo', e => {
        return e.nonce.toNumber() === 5 && e.signerWallet === mockSigner
      })
    })
  })
})
