const MakerDelegateFactory = artifacts.require('MakerDelegateFactory')
const MakerDelegate = artifacts.require('MakerDelegate')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const {
  reverted,
  passes,
  equal,
  emitted,
} = require('@airswap/test-utils').assert
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('MakerDelegate Factory Tests', async accounts => {
  const swapContractOne = accounts[0]
  const swapContractTwo = accounts[1]
  const makerDelegateOwnerOne = accounts[2]
  const makerDelegateOwnerTwo = accounts[2]

  let snapshotId

  let makerDelegateFactory

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Deploy MakerDelegate Factory', async () => {
    makerDelegateFactory = await MakerDelegateFactory.new()
  })

  describe('Test deploying makerDelegates', async () => {
    it('should not deploy a makerDelegate with owner address 0x0', async () => {
      await reverted(
        makerDelegateFactory.createMakerDelegate(swapContractOne, EMPTY_ADDRESS),
        'PEER_CONTRACT_OWNER_REQUIRED'
      )
    })

    it('should not deploy a makerDelegate with swap address 0x0', async () => {
      await reverted(
        makerDelegateFactory.createMakerDelegate(EMPTY_ADDRESS, makerDelegateOwnerOne),
        'SWAP_CONTRACT_REQUIRED'
      )
    })

    it('should emit event and update the mapping', async () => {
      // successful tx
      let tx = await makerDelegateFactory.createMakerDelegate(swapContractOne, makerDelegateOwnerOne)
      passes(tx)

      let makerDelegateAddress

      // emitted event
      emitted(tx, 'CreateMakerDelegate', event => {
        makerDelegateAddress = event.makerDelegateContract
        return (
          event.swapContract === swapContractOne &&
          event.makerDelegateContractOwner === makerDelegateOwnerOne
        )
      })

      let paddedMakerDelegateAddress = padAddressToLocator(makerDelegateAddress)

      // mapping has been updated
      let isTrustedMakerDelegate = await makerDelegateFactory.has.call(paddedMakerDelegateAddress)
      equal(isTrustedMakerDelegate, true)
    })

    it('should create delegate with the correct values', async () => {
      // deploy makerDelegate
      let tx = await makerDelegateFactory.createMakerDelegate(swapContractTwo, makerDelegateOwnerTwo)

      // get makerDelegate address and pad
      let makerDelegateAddress
      emitted(tx, 'CreateMakerDelegate', event => {
        makerDelegateAddress = event.makerDelegateContract
        return (
          event.swapContract === swapContractTwo &&
          event.makerDelegateContractOwner === makerDelegateOwnerTwo
        )
      })
      let paddedMakerDelegateAddress = padAddressToLocator(makerDelegateAddress)

      let isTrustedMakerDelegate = await makerDelegateFactory.has.call(paddedMakerDelegateAddress)
      equal(isTrustedMakerDelegate, true)

      // get the swap and owner values of the makerDelegate
      let makerDelegate = await MakerDelegate.at(makerDelegateAddress)
      let actualSwap = await makerDelegate.swapContract.call()
      let actualOwner = await makerDelegate.owner.call()

      // check they are correct
      equal(swapContractTwo, actualSwap, 'MakerDelegate has incorrect swap address')
      equal(makerDelegateOwnerTwo, actualOwner, 'MakerDelegate has incorrect owner address')
    })
  })
})
