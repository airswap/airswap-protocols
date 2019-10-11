const TokenRegistry = artifacts.require('TokenRegistry')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { reverted, equal, emitted } = require('@airswap/test-utils').assert

contract('TokenRegistry Unit Tests', async accounts => {
  const owner = accounts[0]
  const nonOwner = accounts[1]
  const erc20asset = accounts[4]
  let snapshotId
  let tokenregistry

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Deploy TokenRegistry Factory', async () => {
    tokenregistry = await TokenRegistry.new({ from: owner })
  })

  describe('Test adding to registry', async () => {
    it('test adding when not the owner, should revert', async () => {
      await reverted(
        tokenregistry.addToRegistry('0x80ac58cd', erc20asset, {
          from: nonOwner,
        }),
        'NOT OWNER'
      )
    })

    it('test adding when the owner, should pass', async () => {
      await emitted(
        await tokenregistry.addToRegistry('0x80ac58cd', erc20asset, {
          from: owner,
        }),
        'AddToRegistry'
      )

      equal(
        erc20asset,
        await tokenregistry.getAsset.call('0x80ac58cd'),
        'Unable to find match'
      )
    })
  })

  describe('Test removing to registry', async () => {
    it('test removing when not the owner, should revert', async () => {
      await reverted(
        tokenregistry.removeFromRegistry('0x80ac58cd', { from: nonOwner }),
        'NOT OWNER'
      )
    })

    it('test adding when the owner, should pass', async () => {
      await emitted(
        await tokenregistry.addToRegistry('0x80ac58cd', erc20asset, {
          from: owner,
        }),
        'AddToRegistry'
      )

      await emitted(
        await tokenregistry.removeFromRegistry('0x80ac58cd', { from: owner }),
        'RemoveFromRegistry'
      )
    })
  })
})
