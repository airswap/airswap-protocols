const PeerFactory = artifacts.require('PeerFactory')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const {
  reverted,
  passes,
  isTrue,
  equal,
} = require('@airswap/test-utils').assert

contract('Peer Factory Tests', async accounts => {
  const swapContractOne = accounts[0]
  const swapContractTwo = accounts[1]
  const peerOwnerOne = accounts[2]
  const peerOwnerTwo = accounts[2]

  let snapshotId

  let peerFactory

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Deploy Peer Factory', async () => {
    peerFactory = await PeerFactory.new()
  })

  describe('Test deploying peers', async () => {
    it('should not deploy a peer with owner address 0x0', async () => {
      await reverted(
        peerFactory.deployTrustedPeer(swapContractOne, EMPTY_ADDRESS),
        'Provide a peer owner'
      )
    })

    it('should not deploy a peer with swap address 0x0', async () => {
      await reverted(
        peerFactory.deployTrustedPeer(EMPTY_ADDRESS, peerOwnerOne),
        'Provide a swap address'
      )
    })

    it('should deploy a peer, return the address, and update the mapping', async () => {
      // return the address
      let peerAddress = await peerFactory.deployTrustedPeer.call(
        swapContractOne,
        peerOwnerOne
      )

      // before calling the function, the mapping is false
      let isTrustedPeer = await peerFactory.trustedPeers.call(peerAddress)
      equal(isTrustedPeer, false)

      // successful tx
      let tx = await peerFactory.deployTrustedPeer(
        swapContractOne,
        peerOwnerOne
      )
      passes(tx)

      // mapping has been updated
      isTrustedPeer = await peerFactory.trustedPeers.call(peerAddress)
      isTrue(isTrustedPeer)
    })
  })
})
