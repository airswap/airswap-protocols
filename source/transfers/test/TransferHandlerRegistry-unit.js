const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { equal, emitted, reverted } = require('@airswap/test-utils').assert
const {
  EMPTY_ADDRESS,
  ERC20_INTERFACE_ID,
  ERC721_INTERFACE_ID,
} = require('@airswap/order-utils').constants

contract('TransferHandlerRegistry Unit Tests', async accounts => {
  const erc20TransferHandler = accounts[1]
  let snapshotId
  let transferHandlerRegistry

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('Deploy TransferHandlerRegistry', async () => {
    transferHandlerRegistry = await TransferHandlerRegistry.new()
  })

  describe('Test fetching non-existent handler', async () => {
    it('test fetching non-existent handler, returns null address', async () => {
      equal(
        EMPTY_ADDRESS,
        await transferHandlerRegistry.transferHandlers.call(
          ERC721_INTERFACE_ID
        ),
        'Returns actual non-zero address'
      )
    })
  })

  describe('Test adding handler to registry', async () => {
    it('test adding, should pass', async () => {
      await emitted(
        await transferHandlerRegistry.addTransferHandler(
          ERC20_INTERFACE_ID,
          erc20TransferHandler
        ),
        'AddTransferHandler'
      )

      equal(
        erc20TransferHandler,
        await transferHandlerRegistry.transferHandlers.call(ERC20_INTERFACE_ID),
        'Unable to find match'
      )
    })
  })

  describe('Test adding an existing handler from registry will fail', async () => {
    it('test adding an existing handler will fail', async () => {
      await emitted(
        await transferHandlerRegistry.addTransferHandler(
          ERC20_INTERFACE_ID,
          erc20TransferHandler
        ),
        'AddTransferHandler'
      )
      await reverted(
        transferHandlerRegistry.addTransferHandler(
          ERC20_INTERFACE_ID,
          erc20TransferHandler
        ),
        'HANDLER_EXISTS_FOR_KIND'
      )
    })
  })
})
