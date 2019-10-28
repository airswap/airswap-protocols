const DelegateFactory = artifacts.require('DelegateFactory')
const MockContract = artifacts.require('MockContract')
const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')
const Delegate = artifacts.require('Delegate')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const {
  reverted,
  passes,
  equal,
  emitted,
} = require('@airswap/test-utils').assert
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

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Deploy Delegate Factory', async () => {
    await setupMockToken()
    await setupMockIndexer()
    delegateFactory = await DelegateFactory.new(
      swapContract,
      mockIndexer.address
    )
  })

  async function setupMockToken() {
    mockStakingToken = await MockContract.new()
    let mockFungibleTokenTemplate = await FungibleToken.new()

    mockStakingToken_approve = await mockFungibleTokenTemplate.contract.methods
      .approve(EMPTY_ADDRESS, 0)
      .encodeABI()

    await mockStakingToken.givenMethodReturnBool(mockStakingToken_approve, true)
  }

  async function setupMockIndexer() {
    mockIndexer = await MockContract.new()
    let mockIndexerTemplate = await Indexer.new(EMPTY_ADDRESS)

    //mock stakingToken()
    let mockIndexer_stakingToken = mockIndexerTemplate.contract.methods
      .stakingToken()
      .encodeABI()
    await mockIndexer.givenMethodReturnAddress(
      mockIndexer_stakingToken,
      mockStakingToken.address
    )
  }

  describe('Test deploying factory', async () => {
    it('should have set swapContract', async () => {
      let val = await delegateFactory.swapContract.call()
      equal(
        val,
        swapContract,
        'swap contract was not successfully set on deployment'
      )
    })

    it('should have set indexerContract', async () => {
      let val = await delegateFactory.indexerContract.call()
      equal(
        val,
        mockIndexer.address,
        'swap contract was not successfully set on deployment'
      )
    })
  })

  describe('Test deploying delegates', async () => {
    it('should not deploy a delegate with owner address 0x0', async () => {
      await reverted(
        delegateFactory.createDelegate(EMPTY_ADDRESS, tradeWalletOne),
        'DELEGATE_CONTRACT_OWNER_REQUIRED'
      )
    })

    it('should emit event and update the mapping', async () => {
      // successful tx
      let tx = await delegateFactory.createDelegate(
        delegateOwnerOne,
        tradeWalletOne
      )
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

      let paddedDelegateAddress = padAddressToLocator(delegateAddress)

      // mapping has been updated
      let isTrustedDelegate = await delegateFactory.has.call(
        paddedDelegateAddress
      )
      equal(isTrustedDelegate, true)
    })

    it('should create delegate with the correct values', async () => {
      // deploy delegate
      let tx = await delegateFactory.createDelegate(
        delegateOwnerTwo,
        tradeWalletTwo
      )

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
      let paddedDelegateAddress = padAddressToLocator(delegateAddress)

      let isTrustedDelegate = await delegateFactory.has.call(
        paddedDelegateAddress
      )
      equal(isTrustedDelegate, true)

      // get the swap and owner values of the delegate
      let delegate = await Delegate.at(delegateAddress)
      let actualSwap = await delegate.swapContract.call()
      let actualOwner = await delegate.owner.call()
      let actualTradeWallet = await delegate.tradeWallet.call()

      // check that the addresses are equal
      equal(swapContract, actualSwap, 'Delegate has incorrect swap address')
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
