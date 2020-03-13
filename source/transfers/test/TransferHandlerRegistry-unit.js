const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { equal, emitted, reverted } = require('@airswap/test-utils').assert
const { tokenKinds, ADDRESS_ZERO } = require('@airswap/constants')

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
        ADDRESS_ZERO,
        await transferHandlerRegistry.transferHandlers.call(tokenKinds.ERC721),
        'Returns actual non-zero address'
      )
    })
  })

  describe('Test adding handler to registry', async () => {
    it('test adding, should pass', async () => {
      await emitted(
        await transferHandlerRegistry.addTransferHandler(
          tokenKinds.ERC20,
          erc20TransferHandler
        ),
        'AddTransferHandler'
      )

      equal(
        erc20TransferHandler,
        await transferHandlerRegistry.transferHandlers.call(tokenKinds.ERC20),
        'Unable to find match'
      )
    })
  })

  describe('Test adding an existing handler from registry will fail', async () => {
    it('test adding an existing handler will fail', async () => {
      await emitted(
        await transferHandlerRegistry.addTransferHandler(
          tokenKinds.ERC20,
          erc20TransferHandler
        ),
        'AddTransferHandler'
      )
      await reverted(
        transferHandlerRegistry.addTransferHandler(
          tokenKinds.ERC20,
          erc20TransferHandler
        ),
        'HANDLER_EXISTS_FOR_KIND'
      )
    })
  })
})
