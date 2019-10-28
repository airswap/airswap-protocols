const Swap = artifacts.require('Swap')

const {
  passes,
  emitted,
  notEmitted,
  reverted,
  equal,
} = require('@airswap/test-utils').assert
const {
  takeSnapshot,
  revertToSnapShot,
  advanceTime,
  getTimestampPlusDays,
} = require('@airswap/test-utils').time
const {
  SECONDS_IN_DAY,
  EMPTY_ADDRESS,
} = require('@airswap/order-utils').constants

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

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('deploy Swap', async () => {
    swap = await Swap.new()
  })

  describe('Test swap', async () => {
    it('test when order is expired', async () => {
      let signer = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let sender = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let signature = [EMPTY_ADDRESS, ver, v, r, s]
      let order = [0, 0, signer, sender, affiliate, signature]

      await reverted(swap.swap(order), 'ORDER_EXPIRED')
    })

    it('test when order nonce is too low', async () => {
      let signer = [kind, mockSigner, EMPTY_ADDRESS, 200]
      let sender = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let affiliate = [kind, EMPTY_ADDRESS, EMPTY_ADDRESS, 200]
      let signature = [EMPTY_ADDRESS, ver, v, r, s]
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
      let signature = [EMPTY_ADDRESS, ver, v, r, s]
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
      let signature = [EMPTY_ADDRESS, ver, 0, r, s]
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
        swap.authorizeSigner(delegate, 0, { from: mockSigner }),
        'INVALID_AUTH_SIGNER'
      )
    })

    it('test when the expiration date has passed', async () => {
      await reverted(
        swap.authorizeSigner(mockSigner, 0, { from: sender }),
        'INVALID_AUTH_EXPIRY'
      )
    })

    it('test when the expiration == block.timestamp', async () => {
      // with this method, sometimes ONE_DAY_EXPIRY is 1 second before block.timestamp
      // however ~50% of the time they are equal. This is due to the fact that in the
      // time it takes to perform the below commands, some number of milliseconds pass.
      // Sometimes that pushes the current time into the next second, and sometimes it doesnt.
      // Therefore sometimes the current time is the same time as the expiry, and sometimes
      // the current time is one second after the expiry.

      const ONE_DAY = SECONDS_IN_DAY * 1
      const ONE_DAY_EXPIRY = await getTimestampPlusDays(1)

      // advance the time one day
      await advanceTime(ONE_DAY)

      // set the expiry as the same time as the current time - revert
      await reverted(
        swap.authorizeSigner(mockSigner, ONE_DAY_EXPIRY, { from: sender }),
        'INVALID_AUTH_EXPIRY'
      )
    })

    it('test when there is a valid delegate and the expiration has not expired', async () => {
      const block = await web3.eth.getBlock('latest')
      const time = block.timestamp
      const futureTime = time + 100
      let trx = await swap.authorizeSigner(mockSigner, futureTime, {
        from: sender,
      })
      await passes(trx)

      //check delegateApproval was unset
      let val = await swap.signerAuthorizations.call(sender, mockSigner)
      equal(val, futureTime, 'signer approval was not properly set')

      //check that event was emitted
      emitted(trx, 'AuthorizeSigner', e => {
        return (
          e.authorizerAddress === sender &&
          e.authorizedSigner === mockSigner &&
          e.expiry.toNumber() === futureTime
        )
      })
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
