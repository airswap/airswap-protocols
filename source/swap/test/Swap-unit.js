const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')

const {
  emitted,
  notEmitted,
  reverted,
  equal,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

const NONCE_AVAILABLE = 0x00
const NONCE_UNAVAILABLE = 0x01

contract('Swap Unit Tests', async accounts => {
  const Jun_06_2017T00_00_00_UTC = 1497052800 //a date later than when ganache started
  const mockSigner = accounts[9]
  const mockSender = accounts[7]
  const sender = accounts[0]
  const kind = web3.utils.asciiToHex('FFFF') // hex representation is "0x46464646" this is 4 bytes
  const v = 27
  const r = web3.utils.asciiToHex('r')
  const s = web3.utils.asciiToHex('s')
  const ver = web3.utils.asciiToHex('F') //F is 70 in ASCII. 70 is "0x46" in Hex

  let snapshotId
  let swap
  let types

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('deploy Swap', async () => {
    types = await Types.new()
    await Swap.link('Types', types.address)
    swap = await Swap.new()
  })

  describe('Test swap', async () => {
    it('test when order is expired', async () => {
      let signer = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let sender = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, v, r, s]
      let order = [0, 0, signer, sender, affiliate, signature]

      await reverted(swap.swap(order), 'ORDER_EXPIRED')
    })

    it('test when order nonce is too low', async () => {
      let signer = [kind, mockSigner, EMPTY_ADDRESS, 200]
      let sender = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, v, r, s]
      let order = [
        0,
        Jun_06_2017T00_00_00_UTC,
        signer,
        sender,
        affiliate,
        signature,
      ]

      await swap.invalidate(5, { from: mockSigner })
      await reverted(swap.swap(order), 'NONCE_TOO_LOW')
    })

    it('test when sender is provided, and the sender is unauthorized', async () => {
      let signer = [kind, mockSigner, EMPTY_ADDRESS, 200]
      let sender = [kind, mockSender, EMPTY_ADDRESS, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, v, r, s]
      let order = [
        0,
        Jun_06_2017T00_00_00_UTC,
        signer,
        sender,
        affiliate,
        signature,
      ]

      await reverted(swap.swap(order), 'SENDER_UNAUTHORIZED')
    })

    it('test when sender is provided, the sender is authorized, the signature.v is 0, and the signer wallet is unauthorized', async () => {
      let signer = [kind, mockSigner, EMPTY_ADDRESS, 200]
      let sender = [kind, mockSender, EMPTY_ADDRESS, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, 0, r, s]
      let order = [
        0,
        Jun_06_2017T00_00_00_UTC,
        signer,
        sender,
        affiliate,
        signature,
      ]

      //mock sender will take the order
      await reverted(
        swap.swap(order, { from: mockSender }),
        'SIGNER_UNAUTHORIZED.'
      )
    })

    it('test swap when sender and signer are the same', async () => {
      let signer = [kind, mockSender, EMPTY_ADDRESS, 200]
      let sender = [kind, mockSender, EMPTY_ADDRESS, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 0]
      let signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, 0, r, s]
      let order = [
        0,
        Jun_06_2017T00_00_00_UTC,
        signer,
        sender,
        affiliate,
        signature,
      ]

      await reverted(
        swap.swap(order, { from: mockSender }),
        'INVALID_SELF_TRANSFER'
      )
    })

    it('test adding token that does not transfer swap incorrectly and transfer returns false', async () => {
      // create mocked contract to test transfer
      const fungibleTokenTemplate = await FungibleToken.new()
      const tokenMock = await MockContract.new()

      const token_balance = fungibleTokenTemplate.contract.methods
        .balanceOf(EMPTY_ADDRESS)
        .encodeABI()

      const token_transfer = fungibleTokenTemplate.contract.methods
        .transferFrom(EMPTY_ADDRESS, EMPTY_ADDRESS, 0)
        .encodeABI()

      // The token transfer should return true
      await tokenMock.givenMethodReturnBool(token_transfer, false)
      // balance check should remain constant and thus fail
      await tokenMock.givenMethodReturnUint(token_balance, 1000)

      let signer = [kind, mockSigner, tokenMock.address, 200]
      let sender = [kind, mockSender, tokenMock.address, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 0]
      let signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, 0, r, s]
      let order = [
        0,
        Jun_06_2017T00_00_00_UTC,
        signer,
        sender,
        affiliate,
        signature,
      ]

      // auth signer to be the sender of the order
      await swap.authorizeSender(mockSigner, {
        from: mockSender,
      })
      // auth sender
      //mock sender will take the order
      await reverted(swap.swap(order, { from: mockSigner }), 'TRANSFER_FAILED.')
    })

    it('test adding token that does not transfer swap incorrectly and transfer returns true', async () => {
      // create mocked contract to test transfer
      const fungibleTokenTemplate = await FungibleToken.new()
      const tokenMock = await MockContract.new()

      const token_balance = fungibleTokenTemplate.contract.methods
        .balanceOf(EMPTY_ADDRESS)
        .encodeABI()

      const token_transfer = fungibleTokenTemplate.contract.methods
        .transferFrom(EMPTY_ADDRESS, EMPTY_ADDRESS, 0)
        .encodeABI()

      // The token transfer should return true
      await tokenMock.givenMethodReturnBool(token_transfer, true)
      // balance check should remain constant and thus fail
      await tokenMock.givenMethodReturnUint(token_balance, 1000)

      let signer = [kind, mockSigner, tokenMock.address, 200]
      let sender = [kind, mockSender, tokenMock.address, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 0]
      let signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, 0, r, s]
      let order = [
        0,
        Jun_06_2017T00_00_00_UTC,
        signer,
        sender,
        affiliate,
        signature,
      ]

      // auth signer to be the sender of the order
      await swap.authorizeSender(mockSigner, {
        from: mockSender,
      })
      // auth sender
      //mock sender will take the order
      await reverted(swap.swap(order, { from: mockSigner }), 'TRANSFER_FAILED.')
    })
  })

  describe('Test cancel', async () => {
    it('test cancellation with no items', async () => {
      let trx = await swap.cancel([], { from: mockSigner })
      await notEmitted(trx, 'Cancel')
    })

    it('test cancellation with one item', async () => {
      let trx = await swap.cancel([6], { from: mockSigner })

      //ensure transaction was emitted
      await emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 6 && e.signerWallet === mockSigner
      })

      //ensure the value was set
      let val
      val = await swap.signerNonceStatus.call(mockSigner, 6)
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

  describe('Test invalidate', async () => {
    it('test that given a minimum nonce for a signer is set', async () => {
      let minNonceForSigner = await swap.signerMinimumNonce.call(mockSigner)
      equal(minNonceForSigner, 0, 'mock signer should have min nonce of 0')

      let trx = await swap.invalidate(5, { from: mockSigner })

      let newNonceForSigner = await swap.signerMinimumNonce.call(mockSigner)
      equal(newNonceForSigner, 5, 'mock signer should have a min nonce of 5')

      emitted(trx, 'Invalidate', e => {
        return e.nonce.toNumber() === 5 && e.signerWallet === mockSigner
      })
    })

    it('test that given a minimum nonce that all orders below a nonce value are invalidated', async () => {})
  })

  describe('Test authorize signer', async () => {
    it('test when the message sender is the authorized signer', async () => {
      let delegate = mockSigner
      await reverted(
        swap.authorizeSigner(delegate, { from: mockSigner }),
        'INVALID_AUTH_SIGNER'
      )
    })
  })

  describe('Test revoke', async () => {
    it('test that the revokeSigner is successfully removed', async () => {
      let trx = await swap.revokeSigner(mockSigner, { from: sender })

      //check signerAuthorizations was unset
      let val = await swap.signerAuthorizations.call(sender, mockSigner)
      equal(val, 0, 'signer approval was not properly unset')

      //check that the event was emitted
      emitted(trx, 'RevokeSigner', e => {
        return e.authorizerAddress === sender && e.revokedSigner === mockSigner
      })
    })

    it('test that the revokeSender is successfully removed', async () => {
      let trx = await swap.revokeSender(mockSender)

      //check senderAuthorizations was unset
      let val = await swap.senderAuthorizations.call(sender, mockSender)
      equal(val, 0, 'sender approval was not properly unset')

      //check that the event was emitted
      emitted(trx, 'RevokeSender', e => {
        return e.authorizerAddress === sender && e.revokedSender === mockSender
      })
    })
  })
})
