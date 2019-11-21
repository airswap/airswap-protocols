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
const { orders, signatures } = require('@airswap/order-utils')

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
    const snapShot = await takeSnapshot()
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
      const signer = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      const sender = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      const affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      const signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, v, r, s]
      const order = [0, 0, signer, sender, affiliate, signature]

      await reverted(swap.swap(order), 'ORDER_EXPIRED')
    })

    it('test when order nonce is too low', async () => {
      const signer = [kind, mockSigner, EMPTY_ADDRESS, 200]
      const sender = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      const affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      const signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, v, r, s]
      const order = [
        0,
        Jun_06_2017T00_00_00_UTC,
        signer,
        sender,
        affiliate,
        signature,
      ]

      await swap.cancelUpTo(5, { from: mockSigner })
      await reverted(swap.swap(order), 'NONCE_TOO_LOW')
    })

    it('test when sender is provided, and the sender is unauthorized', async () => {
      const signer = [kind, mockSigner, EMPTY_ADDRESS, 200]
      const sender = [kind, mockSender, EMPTY_ADDRESS, 200]
      const affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      const signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, v, r, s]
      const order = [
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
      const signer = [kind, mockSigner, EMPTY_ADDRESS, 200]
      const sender = [kind, mockSender, EMPTY_ADDRESS, 200]
      const affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      const signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, 0, r, s]
      const order = [
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
      const signer = [kind, mockSender, EMPTY_ADDRESS, 200]
      const sender = [kind, mockSender, EMPTY_ADDRESS, 200]
      const affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 0]
      const signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, 0, r, s]
      const order = [
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

      const signer = [kind, mockSigner, tokenMock.address, 200]
      const sender = [kind, mockSender, tokenMock.address, 200]
      const affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 0]
      const signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, 0, r, s]
      const order = [
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

      const signer = [kind, mockSigner, tokenMock.address, 200]
      const sender = [kind, mockSender, tokenMock.address, 200]
      const affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 0]
      const signature = [EMPTY_ADDRESS, EMPTY_ADDRESS, ver, 0, r, s]
      const order = [
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

    it('test that given a minimum nonce that all orders below a nonce value are cancelled', async () => {})
  })

  describe('Test authorize signer', async () => {
    it('test when the message sender is the authorized signer', async () => {
      const delegate = mockSigner
      await reverted(
        swap.authorizeSigner(delegate, { from: mockSigner }),
        'INVALID_AUTH_SIGNER'
      )
    })
  })

  describe('Test revoke', async () => {
    it('test that the revokeSigner is successfully removed', async () => {
      const trx = await swap.revokeSigner(mockSigner, { from: sender })

      //check signerAuthorizations was unset
      const val = await swap.signerAuthorizations.call(sender, mockSigner)
      equal(val, 0, 'signer approval was not properly unset')

      //check that the event was emitted
      emitted(trx, 'RevokeSigner', e => {
        return e.authorizerAddress === sender && e.revokedSigner === mockSigner
      })
    })

    it('test that the revokeSender is successfully removed', async () => {
      const trx = await swap.revokeSender(mockSender)

      //check senderAuthorizations was unset
      const val = await swap.senderAuthorizations.call(sender, mockSender)
      equal(val, 0, 'sender approval was not properly unset')

      //check that the event was emitted
      emitted(trx, 'RevokeSender', e => {
        return e.authorizerAddress === sender && e.revokedSender === mockSender
      })
    })
  })

  it.only('Test cancel() DOS', async () => {
    for (nonce = 1; nonce < 1000; nonce++) {
      const ss = await takeSnapshot()
      ssid = ss['result']

      console.log('nonce amount: ' + nonce)
      const nonces = []
      for (i = 1; i <= nonce; i++) {
        nonces.push(i)
      }
      const trx = await swap.cancel(nonces, { from: mockSigner })
      console.log(trx.receipt.gasUsed)

      await revertToSnapshot(ssid)
    }
  })
})
