const Swap = artifacts.require('Swap')
const MockContract = artifacts.require('MockContract')
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

  let mockTokenRegistry

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockTokenRegistry() {
    mockTokenRegistry = await MockContract.new()
  }

  before('deploy Swap', async () => {
    await setupMockTokenRegistry()
    swap = await Swap.new(mockTokenRegistry.address)
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

      //sender authorizes signer
      emitted(
        await swap.authorize(mockSigner, Jun_06_2017T00_00_00_UTC, {
          from: mockSender,
        }),
        'Authorize'
      )

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
      val = await swap.signerOrderStatus.call(mockSigner, 6)
      equal(val, 0x02)
    })

    it('test an array of nonces, ensure the cancellation of only those orders', async () => {
      await swap.cancel([1, 2, 4, 6], { from: mockSigner })
      let val
      val = await swap.signerOrderStatus.call(mockSigner, 1)
      equal(val, 0x02)
      val = await swap.signerOrderStatus.call(mockSigner, 2)
      equal(val, 0x02)
      val = await swap.signerOrderStatus.call(mockSigner, 3)
      equal(val, 0x00)
      val = await swap.signerOrderStatus.call(mockSigner, 4)
      equal(val, 0x02)
      val = await swap.signerOrderStatus.call(mockSigner, 5)
      equal(val, 0x00)
      val = await swap.signerOrderStatus.call(mockSigner, 6)
      equal(val, 0x02)
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

  describe('Test authorize', async () => {
    it('test when the message sender is the delegate', async () => {
      let delegate = mockSigner
      await reverted(
        swap.authorize(delegate, 0, { from: mockSigner }),
        'INVALID_AUTH_DELEGATE'
      )
    })

    it('test when the expiration date has passed', async () => {
      await reverted(swap.authorize(mockSigner, 0), 'INVALID_AUTH_EXPIRY')
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
        swap.authorize(mockSigner, ONE_DAY_EXPIRY),
        'INVALID_AUTH_EXPIRY'
      )
    })

    it('test when there is a valid delegate and the expiration has not expired', async () => {
      const block = await web3.eth.getBlock('latest')
      const time = block.timestamp
      const futureTime = time + 100
      let trx = await swap.authorize(mockSigner, futureTime)
      await passes(trx)

      //check delegateApproval was unset
      let val = await swap.delegateApprovals.call(sender, mockSigner)
      equal(val, futureTime, 'delegate approval was not properly set')

      //check that event was emitted
      emitted(trx, 'Authorize', e => {
        return (
          e.approverAddress === sender &&
          e.delegateAddress === mockSigner &&
          e.expiry.toNumber() === futureTime
        )
      })
    })
  })

  describe('Test revoke', async () => {
    it('test that the approval is successfully removed', async () => {
      let trx = await swap.revoke(mockSigner)

      //check delegateApproval was unset
      let val = await swap.delegateApprovals.call(sender, mockSigner)
      equal(val, 0, 'delegate approval was not properly unset')

      //check that the event was emitted
      emitted(trx, 'Revoke', e => {
        return e.approverAddress === sender && e.delegateAddress === mockSigner
      })
    })
  })
})
