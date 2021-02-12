const ethers = require('ethers')
const {
  time: { takeSnapshot, revertToSnapshot },
  assert: { emitted, reverted, notEmitted, equal },
} = require('@airswap/test-utils')
const { ADDRESS_ZERO, SECONDS_IN_DAY } = require('@airswap/constants')
const { createLightSignature } = require('@airswap/utils')
const { getPrivateKeyFromGanacheAccount } = require('./utils')

const Light = artifacts.require('Light')
const IERC20 = artifacts.require('IERC20')
const MockContract = artifacts.require('MockContract')

const emptySignature = {
  r: web3.utils.randomHex(32),
  s: web3.utils.randomHex(32),
  v: 0,
}
const ERC20Interface = new ethers.utils.Interface(IERC20.abi)
const encodeERC20Call = (name, args) =>
  ERC20Interface.encodeFunctionData(name, args)

function createOrder({
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  nonce = Date.now(),
  signerWallet = ADDRESS_ZERO,
  signerToken = ADDRESS_ZERO,
  signerAmount = 0,
  senderWallet = ADDRESS_ZERO,
  senderToken = ADDRESS_ZERO,
  senderAmount = 0,
  v = emptySignature.v,
  r = emptySignature.r,
  s = emptySignature.s,
}) {
  return {
    expiry,
    nonce,
    signerWallet,
    signerToken,
    signerAmount,
    senderWallet,
    senderToken,
    senderAmount,
    v,
    r,
    s,
  }
}

const signOrder = async (order, account, swapContract) => {
  const privKey = getPrivateKeyFromGanacheAccount(account)
  const signerWallet =
    order.signerWallet === ADDRESS_ZERO ? account : order.signerWallet
  const orderWithSigner = { ...order, signerWallet }
  const { v, r, s } = await createLightSignature(
    orderWithSigner,
    privKey,
    swapContract,
    1
  )

  return {
    ...orderWithSigner,
    v,
    r,
    s,
  }
}

function orderToParams(order) {
  return [
    order.nonce,
    order.expiry,
    order.signerWallet,
    order.signerToken,
    order.signerAmount,
    order.senderToken,
    order.senderAmount,
    order.v,
    order.r,
    order.s,
  ]
}

contract('Swap Light Unit Tests', async accounts => {
  const [_, owner, mockSender, mockSigner, feeWallet, anyone] = accounts

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

  describe('Setup', () => {
    const fee = 300
    before('deploy Swap', async () => {
      swap = await Light.new(feeWallet, fee, { from: owner })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test setting fee and fee wallet correctly', async () => {
      const storedFee = await swap.FEE.call()
      const storedFeeWallet = await swap.feeWallet.call()
      equal(storedFee.toNumber(), fee)
      equal(storedFeeWallet, feeWallet)
    })
  })

  describe('Test swap', () => {
    before('deploy Swap', async () => {
      swap = await Light.new(feeWallet, 0, {
        from: owner,
      })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test transfers', async () => {
      const order = createOrderWithMockTokens({
        senderAmount: 1,
        signerAmount: 1,
        senderWallet: mockSender,
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
          e.senderWallet === order.senderWallet &&
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

    it('test authorized signer', async () => {
      const order = createOrderWithMockTokens({
        senderAmount: 1,
        signerAmount: 1,
        senderWallet: mockSender,
        signerWallet: anyone,
      })
      await swap.authorize(mockSigner, {
        from: anyone,
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
          e.signerWallet === order.signerWallet &&
          e.senderWallet === order.senderWallet &&
          e.signerToken === order.signerToken &&
          e.senderToken === order.senderToken &&
          e.signerAmount.toNumber() === order.signerAmount &&
          e.senderAmount.toNumber() === order.senderAmount
        )
      })

      const senderTransferData = encodeERC20Call('transferFrom', [
        mockSender,
        anyone,
        1,
      ])
      const signerTransferData = encodeERC20Call('transferFrom', [
        anyone,
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

      await reverted(swap.swap(...orderToParams(order)), 'EXPIRY_PASSED')
    })

    it('test when order nonce is too low', async () => {
      const order = createOrderWithMockTokens({
        nonce: 0,
        signerAmount: 200,
        senderAmount: 200,
        senderWallet: mockSender,
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
        senderWallet: mockSender,
      })

      const signedOrder = await signOrder(order, mockSigner, swap.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      await swap.swap(...orderToParams(signedOrder), { from: mockSender })
      await reverted(
        swap.swap(...orderToParams(signedOrder), {
          from: mockSender,
        }),
        'NONCE_ALREADY_USED'
      )
    })

    it('test when nonce has been cancelled', async () => {
      await swap.cancel([0], { from: mockSigner })
      const order = createOrderWithMockTokens({
        nonce: 0,
        signerAmount: 200,
        senderAmount: 200,
        senderWallet: mockSender,
      })

      const signedOrder = await signOrder(order, mockSigner, swap.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      await reverted(
        swap.swap(...orderToParams(signedOrder), {
          from: mockSender,
        }),
        'NONCE_ALREADY_USED'
      )
    })

    it('test when signer not authorized', async () => {
      const order = createOrderWithMockTokens({
        nonce: 0,
        signerAmount: 200,
        senderAmount: 200,
        senderWallet: anyone,
      })

      const signedOrder = await signOrder(order, mockSigner, swap.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      await reverted(
        swap.swap(...orderToParams(signedOrder), {
          from: mockSender,
        }),
        'UNAUTHORIZED'
      )
    })
  })

  describe('Test fees', () => {
    const fee = 300
    before('deploy Swap', async () => {
      swap = await Light.new(feeWallet, fee, {
        from: owner,
      })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test transfers with fee', async () => {
      const order = createOrderWithMockTokens({
        senderAmount: 1000,
        signerAmount: 1000,
        senderWallet: mockSender,
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
          e.senderWallet === order.senderWallet &&
          e.signerToken === order.signerToken &&
          e.senderToken === order.senderToken &&
          e.signerAmount.toNumber() === order.signerAmount &&
          e.senderAmount.toNumber() === order.senderAmount
        )
      })

      const senderTransferData = encodeERC20Call('transferFrom', [
        mockSender,
        mockSigner,
        1000,
      ])
      const signerTransferData = encodeERC20Call('transferFrom', [
        mockSigner,
        mockSender,
        1000,
      ])

      const feeTransferData = encodeERC20Call('transferFrom', [
        mockSigner,
        feeWallet,
        30,
      ])

      const senderTransferCalls = await mockSenderToken.invocationCountForCalldata.call(
        senderTransferData
      )
      const signerTransferCalls = await mockSignerToken.invocationCountForCalldata.call(
        signerTransferData
      )
      const feeTransferCalls = await mockSignerToken.invocationCountForCalldata.call(
        feeTransferData
      )

      equal(senderTransferCalls.toNumber(), 1)
      equal(signerTransferCalls.toNumber(), 1)
      equal(feeTransferCalls.toNumber(), 1)
    })
  })

  describe('Test authorization', () => {
    beforeEach('deploy Swap', async () => {
      swap = await Light.new(feeWallet, 0, {
        from: owner,
      })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test authorized is set', async () => {
      const trx = await swap.authorize(mockSigner, { from: anyone })
      emitted(
        trx,
        'Authorized',
        e => e.signer === mockSigner && e.signerWallet === anyone
      )
      const authorized = await swap.authorized(anyone)
      equal(authorized, mockSigner)
    })

    it('test revoke', async () => {
      await swap.authorize(mockSigner, { from: anyone })
      const trx = await swap.revoke({ from: anyone })
      emitted(
        trx,
        'Revoked',
        e => e.signer === mockSigner && e.signerWallet === anyone
      )
      const authorized = await swap.authorized(anyone)
      equal(authorized, ADDRESS_ZERO)
    })
  })

  describe('Test cancel', async () => {
    beforeEach('deploy Swap', async () => {
      swap = await Light.new(feeWallet, 0, {
        from: owner,
      })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test cancellation with no items', async () => {
      const trx = await swap.cancel([], { from: mockSigner })
      await notEmitted(trx, 'Cancel')
    })

    it('test cancellation with duplicated items', async () => {
      const trx = await swap.cancel([1, 1], { from: mockSigner })
      emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 1 && e.signerWallet === mockSigner
      })

      //ensure the value was set
      const val = await swap.nonceUsed.call(mockSigner, 1)
      equal(val, true)
    })

    it('test cancellation of same item twice', async () => {
      const trx = await swap.cancel([1], { from: mockSigner })
      emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 1 && e.signerWallet === mockSigner
      })
      const trx2 = await swap.cancel([1], { from: mockSigner })
      notEmitted(trx2, 'Cancel')

      //ensure the value was set
      const val = await swap.nonceUsed.call(mockSigner, 1)
      equal(val, true)
    })

    it('test cancellation with one item', async () => {
      const trx = await swap.cancel([6], { from: mockSigner })

      //ensure transaction was emitted
      emitted(trx, 'Cancel', e => {
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
    beforeEach('deploy Swap', async () => {
      swap = await Light.new(feeWallet, 0, {
        from: owner,
      })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

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
