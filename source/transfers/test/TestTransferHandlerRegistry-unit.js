const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { equal, emitted, reverted } = require('@airswap/test-utils').assert
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

contract('TransferHandlerRegistry Unit Tests', async accounts => {
  const erc20Asset = accounts[2]
  let snapshotId
  let transferhandlerregistry

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('Deploy TransferHandlerRegistry', async () => {
    transferhandlerregistry = await TransferHandlerRegistry.new()
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
    it('test adding, should pass', async () => {
      await emitted(
        await transferhandlerregistry.addTransferHandler(
          '0x80ac58cd',
          erc20Asset
        ),
        'AddTransferHandler'
      )

      equal(
        erc20Asset,
        await transferhandlerregistry.getTransferHandler.call('0x80ac58cd'),
        'Unable to find match'
      )
    })
  })

  describe('Test adding an existing handler from handler', async () => {
    it('test adding and then removing, should pass', async () => {
      await emitted(
        await transferhandlerregistry.addTransferHandler(
          '0x80ac58cd',
          erc20Asset
        ),
        'AddTransferHandler'
      )
      await reverted(
        transferhandlerregistry.addTransferHandler('0x80ac58cd', erc20Asset),
        'HANDLER_EXISTS_FOR_KIND'
      )
    })
  })
})
