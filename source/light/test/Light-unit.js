const ethers = require('ethers')
const {
  time: { takeSnapshot, revertToSnapshot },
  assert: { emitted, reverted, notEmitted, equal },
} = require('@airswap/test-utils')
const { ADDRESS_ZERO } = require('@airswap/constants')
const { createLightOrder, lightOrderToParams } = require('@airswap/utils')
const { signOrder } = require('./utils')

const Light = artifacts.require('Light')
const IERC20 = artifacts.require('IERC20')
const MockContract = artifacts.require('MockContract')

const ERC20Interface = new ethers.utils.Interface(IERC20.abi)
const encodeERC20Call = (name, args) =>
  ERC20Interface.encodeFunctionData(name, args)

const SIGNER_FEE = 30
const HIGHER_FEE = 50
const FEE_DIVISOR = 10000

contract('Light Unit Tests', async accounts => {
  const [owner, mockSender, mockSigner, feeWallet, anyone] = accounts

  let snapshotId
  let light
  let mockSignerToken
  let mockSenderToken

  const createOrderWithMockTokens = order =>
    createLightOrder({
      signerFee: SIGNER_FEE,
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
    before('deploy Light', async () => {
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test setting fee and fee wallet correctly', async () => {
      light = await Light.new(feeWallet, SIGNER_FEE, { from: owner })
      const storedFee = await light.signerFee.call()
      const storedFeeWallet = await light.feeWallet.call()
      equal(storedFee.toNumber(), SIGNER_FEE)
      equal(storedFeeWallet, feeWallet)
    })

    it('test invalid feeWallet', async () => {
      await reverted(
        Light.new(ADDRESS_ZERO, SIGNER_FEE, { from: owner }),
        'INVALID_FEE_WALLET'
      )
    })

    it('test invalid fee', async () => {
      await reverted(
        Light.new(feeWallet, 100000000000, { from: owner }),
        'INVALID_FEE'
      )
    })
  })

  describe('Test swap', () => {
    before('deploy Light', async () => {
      light = await Light.new(feeWallet, SIGNER_FEE, {
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
        signerWallet: mockSigner,
      })
      const signedOrder = await signOrder(order, mockSigner, light.address)
      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      const tx = await light.swap(...lightOrderToParams(signedOrder), {
        from: mockSender,
      })

      emitted(tx, 'Swap', e => {
        return (
          e.nonce.toString() === order.nonce &&
          e.signerWallet === order.signerWallet &&
          e.signerToken === order.signerToken &&
          e.signerAmount.toString() === order.signerAmount &&
          e.signerFee.toString() === order.signerFee &&
          e.senderWallet === order.senderWallet &&
          e.senderToken === order.senderToken &&
          e.senderAmount.toString() === order.senderAmount
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

      const allSignerTransferCalls = await mockSignerToken.invocationCountForMethod.call(
        signerTransferData
      )

      equal(senderTransferCalls.toNumber(), 1)
      equal(signerTransferCalls.toNumber(), 1)
      equal(allSignerTransferCalls.toNumber(), 1)
    })

    it('test authorized signer', async () => {
      const order = createOrderWithMockTokens({
        senderAmount: 1,
        signerAmount: 1,
        senderWallet: mockSender,
        signerWallet: anyone,
      })
      await light.authorize(mockSigner, {
        from: anyone,
      })
      const signedOrder = await signOrder(order, mockSigner, light.address)
      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      const tx = await light.swap(...lightOrderToParams(signedOrder), {
        from: mockSender,
      })

      emitted(tx, 'Swap', e => {
        return (
          e.nonce.toString() === order.nonce &&
          e.signerWallet === order.signerWallet &&
          e.signerToken === order.signerToken &&
          e.signerAmount.toString() === order.signerAmount &&
          e.signerFee.toString() === order.signerFee &&
          e.senderWallet === order.senderWallet &&
          e.senderToken === order.senderToken &&
          e.senderAmount.toString() === order.senderAmount
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
      const order = await signOrder(
        createLightOrder({
          expiry: 0,
        }),
        mockSigner,
        ADDRESS_ZERO
      )

      await reverted(light.swap(...lightOrderToParams(order)), 'EXPIRY_PASSED')
    })

    it('test when nonce has already been used', async () => {
      const order = createOrderWithMockTokens({
        nonce: 0,
        signerAmount: 200,
        senderAmount: 200,
        senderWallet: mockSender,
      })

      const signedOrder = await signOrder(order, mockSigner, light.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      await light.swap(...lightOrderToParams(signedOrder), { from: mockSender })
      await reverted(
        light.swap(...lightOrderToParams(signedOrder), {
          from: mockSender,
        }),
        'NONCE_ALREADY_USED'
      )
    })

    it('test when nonce has been cancelled', async () => {
      await light.cancel([0], { from: mockSigner })
      const order = createOrderWithMockTokens({
        nonce: 0,
        signerAmount: 200,
        senderAmount: 200,
        senderWallet: mockSender,
      })

      const signedOrder = await signOrder(order, mockSigner, light.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      await reverted(
        light.swap(...lightOrderToParams(signedOrder), {
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

      const signedOrder = await signOrder(order, mockSigner, light.address)

      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      await reverted(
        light.swap(...lightOrderToParams(signedOrder), {
          from: mockSender,
        }),
        'UNAUTHORIZED'
      )
    })

    it('test invalid signature', async () => {
      const order = createOrderWithMockTokens({})

      await reverted(
        light.swap(
          ...lightOrderToParams({ ...order, v: 123, r: '0x1', s: '0x2' }),
          {
            from: mockSender,
          }
        ),
        'INVALID_SIG'
      )
    })
  })

  describe('Test fees', () => {
    before('deploy Light', async () => {
      light = await Light.new(feeWallet, SIGNER_FEE, {
        from: owner,
      })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test changing fee wallet', async () => {
      await light.setFeeWallet(anyone, { from: owner })

      const storedFeeWallet = await light.feeWallet.call()
      equal(storedFeeWallet, anyone)
    })

    it('test only owner can change fee wallet', async () => {
      await reverted(
        light.setFeeWallet(anyone, { from: anyone }),
        'Ownable: caller is not the owner'
      )
    })

    it('test invalid fee wallet', async () => {
      await reverted(
        light.setFeeWallet(ADDRESS_ZERO, { from: owner }),
        'INVALID_FEE_WALLET'
      )
    })

    it('test transfers with fee', async () => {
      const order = createOrderWithMockTokens({
        senderAmount: 1000,
        signerAmount: 1000,
        signerFee: SIGNER_FEE,
        senderWallet: mockSender,
        signerWallet: mockSigner,
      })
      const signedOrder = await signOrder(order, mockSigner, light.address)
      await mockSignerToken.givenAnyReturnBool(true)
      await mockSenderToken.givenAnyReturnBool(true)

      const tx = await light.swap(...lightOrderToParams(signedOrder), {
        from: mockSender,
      })

      emitted(tx, 'Swap', e => {
        return (
          e.nonce.toString() === order.nonce &&
          e.signerWallet === order.signerWallet &&
          e.signerToken === order.signerToken &&
          e.signerAmount.toString() === order.signerAmount &&
          e.signerFee.toString() === order.signerFee &&
          e.senderWallet === order.senderWallet &&
          e.senderToken === order.senderToken &&
          e.senderAmount.toString() === order.senderAmount
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
        3,
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

    it('test changing fee', async () => {
      await light.setFee(HIGHER_FEE, { from: owner })

      const storedSignerFee = await light.signerFee.call()
      equal(storedSignerFee, HIGHER_FEE)
    })

    it('test only owner can change fee', async () => {
      await reverted(
        light.setFee(anyone, { from: anyone }),
        'Ownable: caller is not the owner'
      )
    })

    it('test invalid fee', async () => {
      await reverted(
        light.setFee(FEE_DIVISOR + 1, { from: owner }),
        'INVALID_FEE'
      )
    })

    it('test when signed with incorrect fee', async () => {
      const order = createOrderWithMockTokens({
        signerFee: HIGHER_FEE / 2,
      })

      const signedOrder = await signOrder(order, mockSigner, light.address)

      await reverted(
        light.swap(...lightOrderToParams(signedOrder), {
          from: mockSender,
        }),
        'UNAUTHORIZED'
      )
    })
  })

  describe('Test authorization', () => {
    beforeEach('deploy Light', async () => {
      light = await Light.new(feeWallet, SIGNER_FEE, {
        from: owner,
      })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test authorized is set', async () => {
      const trx = await light.authorize(mockSigner, { from: anyone })
      emitted(
        trx,
        'Authorize',
        e => e.signer === mockSigner && e.signerWallet === anyone
      )
      const authorized = await light.authorized(anyone)
      equal(authorized, mockSigner)
    })

    it('test revoke', async () => {
      await light.authorize(mockSigner, { from: anyone })
      const trx = await light.revoke({ from: anyone })
      emitted(
        trx,
        'Revoke',
        e => e.signer === mockSigner && e.signerWallet === anyone
      )
      const authorized = await light.authorized(anyone)
      equal(authorized, ADDRESS_ZERO)
    })
  })

  describe('Test cancel', async () => {
    beforeEach('deploy Light', async () => {
      light = await Light.new(feeWallet, SIGNER_FEE, {
        from: owner,
      })
      mockSignerToken = await MockContract.new()
      mockSenderToken = await MockContract.new()
    })

    it('test cancellation with no items', async () => {
      const trx = await light.cancel([], { from: mockSigner })
      await notEmitted(trx, 'Cancel')
    })

    it('test cancellation with duplicated items', async () => {
      const trx = await light.cancel([1, 1], { from: mockSigner })
      emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 1 && e.signerWallet === mockSigner
      })

      //ensure the value was set
      const val = await light.nonceUsed.call(mockSigner, 1)
      equal(val, true)
    })

    it('test cancellation of same item twice', async () => {
      const trx = await light.cancel([1], { from: mockSigner })
      emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 1 && e.signerWallet === mockSigner
      })
      const trx2 = await light.cancel([1], { from: mockSigner })
      notEmitted(trx2, 'Cancel')

      //ensure the value was set
      const val = await light.nonceUsed.call(mockSigner, 1)
      equal(val, true)
    })

    it('test cancellation with one item', async () => {
      const trx = await light.cancel([6], { from: mockSigner })

      //ensure transaction was emitted
      emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 6 && e.signerWallet === mockSigner
      })

      //ensure the value was set
      const val = await light.nonceUsed.call(mockSigner, 6)
      equal(val, true)
    })

    it('test an array of nonces, ensure the cancellation of only those orders', async () => {
      await light.cancel([1, 2, 4, 6], { from: mockSigner })
      let val
      val = await light.nonceUsed.call(mockSigner, 1)
      equal(val, true)
      val = await light.nonceUsed.call(mockSigner, 2)
      equal(val, true)
      val = await light.nonceUsed.call(mockSigner, 3)
      equal(val, false)
      val = await light.nonceUsed.call(mockSigner, 4)
      equal(val, true)
      val = await light.nonceUsed.call(mockSigner, 5)
      equal(val, false)
      val = await light.nonceUsed.call(mockSigner, 6)
      equal(val, true)
    })
  })
})
