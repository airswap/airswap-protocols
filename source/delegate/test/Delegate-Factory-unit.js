const DelegateFactory = artifacts.require('DelegateFactory')
const MockContract = artifacts.require('MockContract')
const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')
const Delegate = artifacts.require('Delegate')

const { ADDRESS_ZERO } = require('@airswap/constants')
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { passes, equal, emitted } = require('@airswap/test-utils').assert
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('Delegate Factory Tests', async accounts => {
  const swapContract = accounts[1]
  const delegateOwnerOne = accounts[2]
  const delegateOwnerTwo = accounts[3]
  const tradeWalletOne = accounts[4]
  const tradeWalletTwo = accounts[5]

  let mockIndexer
  let mockStakingToken
  let mockStakingToken_approve

  let snapshotId
  let delegateFactory

  const PROTOCOL = '0x0001'

  async function setupMockToken() {
    mockStakingToken = await MockContract.new()
    const mockFungibleTokenTemplate = await FungibleToken.new()

    mockStakingToken_approve = await mockFungibleTokenTemplate.contract.methods
      .approve(ADDRESS_ZERO, 0)
      .encodeABI()

    await mockStakingToken.givenMethodReturnBool(mockStakingToken_approve, true)
  }

  async function setupMockIndexer() {
    mockIndexer = await MockContract.new()
    const mockIndexerTemplate = await Indexer.new(ADDRESS_ZERO)

    //mock stakingToken()
    const mockIndexer_stakingToken = mockIndexerTemplate.contract.methods
      .stakingToken()
      .encodeABI()
    await mockIndexer.givenMethodReturnAddress(
      mockIndexer_stakingToken,
      mockStakingToken.address
    )
  }

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('Deploy Delegate Factory', async () => {
    await setupMockToken()
    await setupMockIndexer()
    delegateFactory = await DelegateFactory.new(
      swapContract,
      mockIndexer.address,
      PROTOCOL
    )
  })

  describe('Test deploying factory', async () => {
    it('should have set swapContract', async () => {
      const val = await delegateFactory.swapContract.call()
      equal(
        val,
        swapContract,
        'swap contract was not successfully set on deployment'
      )
    })

    it('should have set indexerContract', async () => {
      const val = await delegateFactory.indexerContract.call()
      equal(
        val,
        mockIndexer.address,
        'swap contract was not successfully set on deployment'
      )
    })
  })

  describe('Test deploying delegates', async () => {
    it('should emit event and update the mapping', async () => {
      // successful tx
      const tx = await delegateFactory.createDelegate(tradeWalletOne, {
        from: delegateOwnerOne,
      })
      passes(tx)

      let delegateAddress

      // emitted event
      emitted(tx, 'CreateDelegate', event => {
        delegateAddress = event.delegateContract
        return (
          event.swapContract === swapContract &&
          event.delegateContractOwner === delegateOwnerOne &&
          event.delegateTradeWallet === tradeWalletOne
        )
      })

      const paddedDelegateAddress = padAddressToLocator(delegateAddress)

      // mapping has been updated
      const isTrustedDelegate = await delegateFactory.has.call(
        paddedDelegateAddress
      )
      equal(isTrustedDelegate, true)
    })

    it('should create delegate with the correct values', async () => {
      // deploy delegate
      const tx = await delegateFactory.createDelegate(tradeWalletTwo, {
        from: delegateOwnerTwo,
      })

      // get delegate address and pad
      let delegateAddress
      emitted(tx, 'CreateDelegate', event => {
        delegateAddress = event.delegateContract
        return (
          event.swapContract === swapContract &&
          event.delegateContractOwner === delegateOwnerTwo &&
          event.delegateTradeWallet === tradeWalletTwo
        )
      })
      const paddedDelegateAddress = padAddressToLocator(delegateAddress)

      const isTrustedDelegate = await delegateFactory.has.call(
        paddedDelegateAddress
      )
      equal(isTrustedDelegate, true)

      // get the swap and owner values of the delegate
      const delegate = await Delegate.at(delegateAddress)
      const actualSwap = await delegate.swapContract.call()
      const actualOwner = await delegate.owner.call()
      const actualTradeWallet = await delegate.tradeWallet.call()
      const actualProtocol = await delegate.protocol.call()

      // check that the addresses are equal
      equal(swapContract, actualSwap, 'Delegate has incorrect swap address')
      equal(PROTOCOL, actualProtocol, 'Delegate has incorrect protocol')
      equal(
        delegateOwnerTwo,
        actualOwner,
        'Delegate has incorrect owner address'
      )
      equal(
        tradeWalletTwo,
        actualTradeWallet,
        'Delegate has incorrect trade wallet address'
      )
    })
  })
})
