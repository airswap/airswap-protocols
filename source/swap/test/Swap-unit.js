const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const MockContract = artifacts.require('MockContract')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const {
  emitted,
  reverted,
  notEmitted,
  equal,
} = require('@airswap/test-utils').assert
const {
  takeSnapshot,
  revertToSnapshot,
  getTimestampPlusDays,
} = require('@airswap/test-utils').time
const { ADDRESS_ZERO } = require('@airswap/constants')
const { createOrder } = require('@airswap/utils')
const { emptySignature } = require('@airswap/types')

const NONCE_AVAILABLE = 0x00
const NONCE_UNAVAILABLE = 0x01

contract('Swap Unit Tests', async accounts => {
  const mockSigner = accounts[1]
  const mockSender = accounts[2]
  const sender = accounts[3]

  const kind = web3.utils.asciiToHex('FFFF') // hex representation is "0x46464646" this is 4 bytes

  let snapshotId
  let swap
  let types
  let mockRegistry

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('deploy Swap', async () => {
    types = await Types.new()
    await Swap.link('Types', types.address)
    mockRegistry = await MockContract.new()
    swap = await Swap.new(mockRegistry.address)
  })

  describe('Test swap', async () => {
    it('test when order is expired', async () => {
      const order = createOrder({
        expiry: 0,
        nonce: 0,
        signer: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        sender: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        affiliate: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
      })

      await reverted(
        swap.swap({ ...order, signature: emptySignature }),
        'ORDER_EXPIRED'
      )
    })

    it('test when order nonce is too low', async () => {
      const order = createOrder({
        expiry: await getTimestampPlusDays(1),
        nonce: 0,
        signer: {
          kind: kind,
          wallet: mockSigner,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        sender: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        affiliate: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
      })

      await swap.cancelUpTo(5, { from: mockSigner })
      await reverted(
        swap.swap({ ...order, signature: emptySignature }),
        'NONCE_TOO_LOW'
      )
    })

    it('test when sender is provided, and the sender is unauthorized', async () => {
      const order = createOrder({
        expiry: await getTimestampPlusDays(1),
        nonce: 0,
        signer: {
          kind: kind,
          wallet: mockSigner,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        sender: {
          kind: kind,
          wallet: mockSender,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        affiliate: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
      })

      await reverted(
        swap.swap({ ...order, signature: emptySignature }),
        'SENDER_UNAUTHORIZED'
      )
    })

    it('test when sender is provided, the sender is authorized, the signature.v is 0, and the signer wallet is unauthorized', async () => {
      const order = createOrder({
        expiry: await getTimestampPlusDays(1),
        nonce: 0,
        signer: {
          kind: kind,
          wallet: mockSigner,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        sender: {
          kind: kind,
          wallet: mockSender,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        affiliate: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
      })

      //mock sender will take the order
      await reverted(
        swap.swap(
          { ...order, signature: emptySignature },
          { from: mockSender }
        ),
        'SIGNER_UNAUTHORIZED.'
      )
    })

    it('test swap when sender and signer are the same', async () => {
      const order = createOrder({
        expiry: await getTimestampPlusDays(1),
        nonce: 0,
        signer: {
          kind: kind,
          wallet: mockSender,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        sender: {
          kind: kind,
          wallet: mockSender,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        affiliate: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
      })

      await reverted(
        swap.swap(
          { ...order, signature: emptySignature },
          { from: mockSender }
        ),
        'SELF_TRANSFER_INVALID'
      )
    })

    it('test adding ERC20TransferHandler that does not swap incorrectly and transferTokens reverts', async () => {
      const handlerTemplate = await ERC20TransferHandler.new()
      const handlerTemplateMock = await MockContract.new()
      const transferHandlerRegistryTemplate = await TransferHandlerRegistry.new()

      const handler_transferTokens = handlerTemplate.contract.methods
        .transferTokens(ADDRESS_ZERO, ADDRESS_ZERO, 0, 0, ADDRESS_ZERO)
        .encodeABI()

      const registry_transferHandlers = transferHandlerRegistryTemplate.contract.methods
        .transferHandlers(kind)
        .encodeABI()

      await mockRegistry.givenMethodReturnAddress(
        registry_transferHandlers,
        handlerTemplateMock.address
      )

      await handlerTemplateMock.givenMethodRevert(handler_transferTokens)

      const order = createOrder({
        expiry: await getTimestampPlusDays(1),
        nonce: 0,
        signer: {
          kind: kind,
          wallet: mockSigner,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        sender: {
          kind: kind,
          wallet: mockSender,
          amount: 200,
          token: ADDRESS_ZERO,
        },
        affiliate: {
          kind: kind,
          wallet: ADDRESS_ZERO,
          amount: 200,
          token: ADDRESS_ZERO,
        },
      })

      // auth signer to be the sender of the order
      await swap.authorizeSender(mockSigner, {
        from: mockSender,
      })

      await reverted(
        swap.swap({ ...order, signature: emptySignature }, { from: mockSender })
      )
    })
  })
  describe('Test cancel', async () => {
    it('test cancellation with no items', async () => {
      const trx = await swap.cancel([], { from: mockSigner })
      await notEmitted(trx, 'Cancel')
    })

    it('test cancellation with one item', async () => {
      const trx = await swap.cancel([6], { from: mockSigner })

      //ensure transaction was emitted
      await emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 6 && e.signerWallet === mockSigner
      })

      //ensure the value was set
      const val = await swap.signerNonceStatus.call(mockSigner, 6)
      equal(val, NONCE_UNAVAILABLE)
    })

    it('test an array of nonces, ensure the cancellation of only those orders', async () => {
      await swap.cancel([1, 2, 4, 6], { from: mockSigner })
      let val
      val = await swap.signerNonceStatus.call(mockSigner, 1)
      equal(val, NONCE_UNAVAILABLE)
      val = await swap.signerNonceStatus.call(mockSigner, 2)
      equal(val, NONCE_UNAVAILABLE)
      val = await swap.signerNonceStatus.call(mockSigner, 3)
      equal(val, NONCE_AVAILABLE)
      val = await swap.signerNonceStatus.call(mockSigner, 4)
      equal(val, NONCE_UNAVAILABLE)
      val = await swap.signerNonceStatus.call(mockSigner, 5)
      equal(val, NONCE_AVAILABLE)
      val = await swap.signerNonceStatus.call(mockSigner, 6)
      equal(val, NONCE_UNAVAILABLE)
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

  describe('Test authorize signer', async () => {
    it('test when the message sender is the authorized signer', async () => {
      const delegate = mockSigner
      await reverted(
        swap.authorizeSigner(delegate, { from: mockSigner }),
        'SELF_AUTH_INVALID'
      )
    })
  })

  describe('Test revoke', async () => {
    it('test that the revokeSigner is successfully removed', async () => {
      const trx = await swap.revokeSigner(mockSigner, { from: sender })

      //check signerAuthorizations was unset
      const val = await swap.signerAuthorizations.call(sender, mockSigner)
      equal(val, 0, 'signer approval was not properly unset')

      //check that the event was not emitted as the authsigner did not exist
      notEmitted(trx, 'RevokeSigner')
    })

    it('test that the revokeSender is successfully removed', async () => {
      const trx = await swap.revokeSender(mockSender)

      //check senderAuthorizations was unset
      const val = await swap.senderAuthorizations.call(sender, mockSender)
      equal(val, 0, 'sender approval was not properly unset')

      //check that the event was was not emitted as the authsender did not exist
      notEmitted(trx, 'RevokeSender')
    })
  })
})
