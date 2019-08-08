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

contract('Swap Unit Tests', async accounts => {
  const Jun_06_2017T00_00_00_UTC = 1497052800 //a date later than than when ganache started
  const mockMaker = accounts[9]
  const mockMakerToken = accounts[8]
  const mockTaker = accounts[7]
  const mockTakerToken = accounts[6]
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
      let maker = [EMPTY_ADDRESS, EMPTY_ADDRESS, 200, kind]
      let taker = [EMPTY_ADDRESS, EMPTY_ADDRESS, 200, kind]
      let affiliate = [EMPTY_ADDRESS, EMPTY_ADDRESS, 200, kind]
      let order = [0, 0, maker, taker, affiliate]
      let signature = [EMPTY_ADDRESS, v, r, s, ver]

      await reverted(swap.swap(order, signature), 'ORDER_EXPIRED')
    })

    it('test when order nonce is too low', async () => {
      let maker = [mockMaker, EMPTY_ADDRESS, 200, kind]
      let taker = [EMPTY_ADDRESS, EMPTY_ADDRESS, 200, kind]
      let affiliate = [EMPTY_ADDRESS, EMPTY_ADDRESS, 200, kind]
      let order = [0, Jun_06_2017T00_00_00_UTC, maker, taker, affiliate]
      let signature = [EMPTY_ADDRESS, v, r, s, ver]

      await swap.invalidate(5, { from: mockMaker })
      await reverted(swap.swap(order, signature), 'NONCE_TOO_LOW')
    })

    it('test when taker is provided, and the sender is unauthorized', async () => {
      let maker = [mockMaker, EMPTY_ADDRESS, 200, kind]
      let taker = [mockTaker, EMPTY_ADDRESS, 200, kind]
      let affiliate = [EMPTY_ADDRESS, EMPTY_ADDRESS, 200, kind]
      let order = [0, Jun_06_2017T00_00_00_UTC, maker, taker, affiliate]
      let signature = [EMPTY_ADDRESS, v, r, s, ver]

      await reverted(swap.swap(order, signature), 'SENDER_UNAUTHORIZED')
    })

    it('test when taker is provided, the sender is authorized, the signature.v is 0, and the maker wallet is unauthorized', async () => {
      let maker = [mockMaker, EMPTY_ADDRESS, 200, kind]
      let taker = [mockTaker, EMPTY_ADDRESS, 200, kind]
      let affiliate = [EMPTY_ADDRESS, EMPTY_ADDRESS, 200, kind]
      let order = [0, Jun_06_2017T00_00_00_UTC, maker, taker, affiliate]
      let signature = [EMPTY_ADDRESS, 0, r, s, ver]

      //taker authorizes maker
      emitted(
        await swap.authorize(mockMaker, Jun_06_2017T00_00_00_UTC, {
          from: mockTaker,
        }),
        'Authorize'
      )

      //mock taker will take the order
      await reverted(
        swap.swap(order, signature, { from: mockTaker }),
        'SIGNER_UNAUTHORIZED.'
      )
    })
  })

  describe('Test swap simple', async () => {
    it('test when order is expired', async () => {
      await reverted(
        swap.swapSimple(
          0,
          500,
          mockMaker,
          100,
          mockMakerToken,
          mockTaker,
          100,
          mockTakerToken,
          v,
          r,
          s
        ),
        'ORDER_EXPIRED'
      )
    })

    it('test when the order nonce is too low', async () => {
      //invalidate all nonces below 2
      await swap.invalidate(2, { from: mockMaker })

      await reverted(
        swap.swapSimple(
          0,
          Jun_06_2017T00_00_00_UTC,
          mockMaker,
          100,
          mockMakerToken,
          mockTaker,
          100,
          mockTakerToken,
          v,
          r,
          s,
          { from: mockMaker }
        ),
        'NONCE_TOO_LOW'
      )
    })

    it('test when taker is unprovided, the signature.v is 0, and the maker wallet is unauthorized', async () => {
      await reverted(
        swap.swapSimple(
          0,
          Jun_06_2017T00_00_00_UTC,
          mockMaker,
          100,
          mockMakerToken,
          EMPTY_ADDRESS, //unprovided taker
          100,
          mockTakerToken,
          0,
          r,
          s,
          { from: mockTaker }
        ),
        'SIGNER_UNAUTHORIZED'
      )
    })
  })

  describe('Test cancel', async () => {
    it('test cancellation with no items', async () => {
      let trx = await swap.cancel([], { from: mockMaker })
      await notEmitted(trx, 'Cancel')
    })

    it('test cancellation with one item', async () => {
      let trx = await swap.cancel([6], { from: mockMaker })

      //ensure transaction was emitted
      await emitted(trx, 'Cancel', e => {
        return e.nonce.toNumber() === 6 && e.makerWallet === mockMaker
      })

      //ensure the value was set
      let val
      val = await swap.makerOrderStatus.call(mockMaker, 6)
      equal(val, 0x02)
    })

    it('test an array of nonces, ensure the cancellation of only those orders', async () => {
      await swap.cancel([1, 2, 4, 6], { from: mockMaker })
      let val
      val = await swap.makerOrderStatus.call(mockMaker, 1)
      equal(val, 0x02)
      val = await swap.makerOrderStatus.call(mockMaker, 2)
      equal(val, 0x02)
      val = await swap.makerOrderStatus.call(mockMaker, 3)
      equal(val, 0x00)
      val = await swap.makerOrderStatus.call(mockMaker, 4)
      equal(val, 0x02)
      val = await swap.makerOrderStatus.call(mockMaker, 5)
      equal(val, 0x00)
      val = await swap.makerOrderStatus.call(mockMaker, 6)
      equal(val, 0x02)
    })
  })

  describe('Test invalidate', async () => {
    it('test that given a minimum nonce for a maker is set', async () => {
      let minNonceForMaker = await swap.makerMinimumNonce.call(mockMaker)
      equal(minNonceForMaker, 0, 'mock maker should have min nonce of 0')

      let trx = await swap.invalidate(5, { from: mockMaker })

      let newNonceForMaker = await swap.makerMinimumNonce.call(mockMaker)
      equal(newNonceForMaker, 5, 'mock macker should have a min nonce of 5')

      emitted(trx, 'Invalidate', e => {
        return e.nonce.toNumber() === 5 && e.makerWallet === mockMaker
      })
    })

    it('test that given a minimum nonce that all orders below a nonce value are invalidated', async () => {})
  })

  describe('Test authorize', async () => {
    it('test when the message sender is the delegate', async () => {
      let delegate = mockMaker
      await reverted(
        swap.authorize(delegate, 0, { from: mockMaker }),
        'INVALID_AUTH_PEER'
      )
    })

    it('test when the expiration date has passed', async () => {
      await reverted(swap.authorize(mockMaker, 0), 'INVALID_AUTH_EXPIRY')
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
        swap.authorize(mockMaker, ONE_DAY_EXPIRY),
        'INVALID_AUTH_EXPIRY'
      )
    })

    it('test when there is a valid delegate and the expiration has not expired', async () => {
      const block = await web3.eth.getBlock('latest')
      const time = block.timestamp
      const futureTime = time + 100
      let trx = await swap.authorize(mockMaker, futureTime)
      await passes(trx)

      //check delegateApproval was unset
      let val = await swap.delegateApprovals.call(sender, mockMaker)
      equal(val, futureTime, 'delegate approval was not properly set')

      //check that event was emitted
      emitted(trx, 'Authorize', e => {
        return (
          e.approverAddress === sender &&
          e.delegateAddress === mockMaker &&
          e.expiry.toNumber() === futureTime
        )
      })
    })
  })

  describe('Test revoke', async () => {
    it('test that the approval is successfully removed', async () => {
      let trx = await swap.revoke(mockMaker)

      //check delegateApproval was unset
      let val = await swap.delegateApprovals.call(sender, mockMaker)
      equal(val, 0, 'delegate approval was not properly unset')

      //check that the event was emitted
      emitted(trx, 'Revoke', e => {
        return e.approverAddress === sender && e.delegateAddress === mockMaker
      })
    })
  })
})
