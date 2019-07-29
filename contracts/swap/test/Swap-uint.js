const Swap = artifacts.require('Swap')
const MockContract = artifacts.require('MockContract')

const {
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { allowances, balances } = require('@airswap/test-utils').balances
const { getLatestTimestamp } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')

contract('Swap Unit Tests', async () => {
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
    swap = Swap.new()
  })

  describe('Test initial values', async () => {
  })

  describe('Test swap', async () => {
    it('test when order is expired', async () => {
    })

    it('test when order is taken', async () => {
    })

    it('test when order is canceled', async () => {
    })

    it('test when order nonce is too low', async () => {
    })

    it('test when taker is an empty address', async () => {
    })

    it('test when order is not specified', async () => {
    })

    it('test when order is specified, but not authorized', async () => {
    })

    it('test when order is specified, and is authorized', async () => {
    })

    it('test when order signature.v is 0, and the order maker is unauthorized', async () => {
    })

    it('test when order signature.v is 0, and the order maker is authorized', async () => {
    })

    it('test when order signature.v is not 0, and the order maker is unauthorized', async () => {
    })

    it('test when order signature.v is not 0, the order make is authorized, and the signature is invalid', async () => {
    })

    it('test when order signature.v is not 0, the order make is authorized, and the signature is valid', async () => {
    })

    it('test when order taker token is an empty address, and the value is not the expected value to be sent', async () => {
    })

    it('test when order taker token is an empty address, and the value is the expected value to be sent', async () => {
    })

    it('tes when order taker token is not an empty address, and the value is not the expected value to be sent', async () => {
    })

    it('test when order taker token is not an empty address, and the value is the expected value to be sent', async () => {
    })

    it('test when order affiliate is an empty address', async () => {
    })

    it('test when order affiliate is an not an empty address', async () => {
    })
  })

  describe('Test swapSimple', async () => {
    it('test when the order is unavailable', async () => {
    })

    it('test when the order has expired', async () => {
    })
    
    it('test when the nonce is too low', async () => {
    })

    it('test when the taker address is the empty address', async () => {
    })

    it('test when taker address is not the empty address and the message sender is the taker wallet', async () => {
    })

    it('test when taker address is not the empty address and the message sender is not the taker wallet', async () => {
    })

    it('test when taker address is not the empty address and the message sender is not the taker wallet, and the taker wallet is unauthorized', async () => {
    })

    it('test when taker address is not the empty address and the message sender is not the taker wallet, and the taker wallet is authorized', async () => {
    })

    it('test when v == 0, and maker wallet is unauthorized', async () => {
    })

    it('test when v == 0, and maker wallet is authorized', async () => {
    })

    it('test when v != 0, and the signature is invalid', async () => {
    })

    it('test when v != 0, and the signature is valid', async () => {
    })

    it('test when taker token is the empty address, and the value is not set', async () => {
    })

    it('test when taker token is the empty address, and the value is set', async () => {
    })

    it('test when taker token is not the empty address, and the value is set', async () => {
    })

    it('test when taker token is not the empty address, and the value is not set', async () => {
    })
  })

  descrive('Test cancel', async () => {
  })

  descrive('Test invalidate', async () => {
  })

  descrive('Test authorize', async () => {
  })

  descrive('Test revoke', async () => {
  })
})
