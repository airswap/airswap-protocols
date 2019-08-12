const PeerFactory = artifacts.require('PeerFactory')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

contract('Peer Factory Tests', async accounts => {
  const swapContractOne = accounts[0]
  const swapContractTwo = accounts[1]
  const peerOwnerOne = accounts[2]
  const peerOwnerTwo = accounts[2]

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })
})
