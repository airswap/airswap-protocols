const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { reverted, equal, emitted } = require('@airswap/test-utils').assert
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

contract('TransferHandlerRegistry Unit Tests', async accounts => {
  const owner = accounts[0]
  const nonOwner = accounts[1]
  const erc20Asset = accounts[2]
  let snapshotId
  let transferhandlerregistry

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Deploy TransferHandlerRegistry', async () => {
    transferhandlerregistry = await TransferHandlerRegistry.new({ from: owner })
  })

  describe('Test fetching non-existent handler', async () => {
    it('test fetching non-existent handler, returns null address', async () => {
      equal(
        EMPTY_ADDRESS,
        await transferhandlerregistry.getTransferHandler.call('0x80ac58cd'),
        'Returns actual non-zero address'
      )
    })
  })

  describe('Test adding to handler', async () => {
    it('test adding when not the owner, should revert', async () => {
      await reverted(
        transferhandlerregistry.addHandler('0x80ac58cd', erc20Asset, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('test adding when the owner, should pass', async () => {
      await emitted(
        await transferhandlerregistry.addHandler('0x80ac58cd', erc20Asset, {
          from: owner,
        }),
        'AddHandler'
      )

      equal(
        erc20Asset,
        await transferhandlerregistry.getTransferHandler.call('0x80ac58cd'),
        'Unable to find match'
      )
    })
  })

  describe('Test removing from handler', async () => {
    it('test removing when not the owner, should revert', async () => {
      await reverted(
        transferhandlerregistry.removeHandler('0x80ac58cd', { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('test adding and then removing when the owner, should pass', async () => {
      await emitted(
        await transferhandlerregistry.addHandler('0x80ac58cd', erc20Asset, {
          from: owner,
        }),
        'AddHandler'
      )

      await emitted(
        await transferhandlerregistry.removeHandler('0x80ac58cd', {
          from: owner,
        }),
        'RemoveHandler'
      )
    })
  })
})
