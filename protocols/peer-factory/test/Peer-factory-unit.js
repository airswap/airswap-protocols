const PeerFactory = artifacts.require('PeerFactory')
const Peer = artifacts.require('Peer')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const {
  reverted,
  passes,
  equal,
  emitted,
} = require('@airswap/test-utils').assert
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('Peer Factory Tests', async accounts => {
  const swapContractOne = accounts[1]
  const swapContractTwo = accounts[2]
  const peerOwnerOne = accounts[3]
  const peerOwnerTwo = accounts[4]
  const tradeWalletOne = accounts[5]
  const tradeWalletTwo = accounts[6]

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
        peerFactory.createPeer(swapContractOne, EMPTY_ADDRESS, tradeWalletOne),
        'PEER_CONTRACT_OWNER_REQUIRED'
      )
    })

    it('should not deploy a peer with swap address 0x0', async () => {
      await reverted(
        peerFactory.createPeer(EMPTY_ADDRESS, peerOwnerOne, tradeWalletOne),
        'SWAP_CONTRACT_REQUIRED'
      )
    })

    it('should emit event and update the mapping', async () => {
      // successful tx
      let tx = await peerFactory.createPeer(
        swapContractOne,
        peerOwnerOne,
        tradeWalletOne
      )
      passes(tx)

      let peerAddress

      // emitted event
      emitted(tx, 'CreatePeer', event => {
        peerAddress = event.peerContract
        return (
          event.swapContract === swapContractOne &&
          event.peerContractOwner === peerOwnerOne &&
          event.peerTradeWallet === tradeWalletOne
        )
      })

      let paddedPeerAddress = padAddressToLocator(peerAddress)

      // mapping has been updated
      let isTrustedPeer = await peerFactory.has.call(paddedPeerAddress)
      equal(isTrustedPeer, true)
    })

    it('should create delegate with the correct values', async () => {
      // deploy peer
      let tx = await peerFactory.createPeer(
        swapContractTwo,
        peerOwnerTwo,
        tradeWalletTwo
      )

      // get peer address and pad
      let peerAddress
      emitted(tx, 'CreatePeer', event => {
        peerAddress = event.peerContract
        return (
          event.swapContract === swapContractTwo &&
          event.peerContractOwner === peerOwnerTwo &&
          event.peerTradeWallet === tradeWalletTwo
        )
      })
      let paddedPeerAddress = padAddressToLocator(peerAddress)

      let isTrustedPeer = await peerFactory.has.call(paddedPeerAddress)
      equal(isTrustedPeer, true)

      // get the swap and owner values of the peer
      let peer = await Peer.at(peerAddress)
      let actualSwap = await peer.swapContract.call()
      let actualOwner = await peer.owner.call()
      let actualTradeWallet = await peer.tradeWallet.call()

      // check they are correct
      equal(swapContractTwo, actualSwap, 'Peer has incorrect swap address')
      equal(peerOwnerTwo, actualOwner, 'Peer has incorrect owner address')
      equal(
        tradeWalletTwo,
        actualTradeWallet,
        'Peer has incorrect trade wallet address'
      )
    })
  })
})
