const DelegateV2 = artifacts.require('DelegateV2')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Indexer = artifacts.require('Indexer')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')

const ethers = require('ethers')
const { ADDRESS_ZERO } = require('@airswap/constants')
const { emptySignature } = require('@airswap/types')
const { createOrder, signOrder } = require('@airswap/utils')
const {
  equal,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { GANACHE_PROVIDER } = require('@airswap/test-utils').constants

contract('Delegate Unit Tests', async accounts => {
  const owner = accounts[0]
  const tradeWallet = accounts[1]
  const mockTokenOne = accounts[2]
  const mockTokenTwo = accounts[3]
  const mockRegistry = accounts[4]
  const notOwner = accounts[4]

  const PROTOCOL = '0x0006'

  let swap_swap
  let mockSwap
  let swapAddress
  let mockIndexer
  let snapshotId
  let mockStakingToken
  let mockFungibleTokenTemplate
  let mockStakingToken_approve

  let delegate

  async function setupMockStakingToken() {
    mockStakingToken = await MockContract.new()
    mockFungibleTokenTemplate = await FungibleToken.new()

    mockStakingToken_approve = await mockFungibleTokenTemplate.contract.methods
      .approve(ADDRESS_ZERO, 0)
      .encodeABI()
  }

  async function setupMockSwap() {
    const types = await Types.new()
    await Swap.link('Types', types.address)
    const swapTemplate = await Swap.new(mockRegistry)
    const order = createOrder({})
    swap_swap = swapTemplate.contract.methods
      .swap({ ...order, signature: emptySignature })
      .encodeABI()

    mockSwap = await MockContract.new()
    swapAddress = mockSwap.address
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

  before('Setup DelegateV2 Contract', async () => {
    await setupMockSwap()
    await setupMockStakingToken()
    await setupMockIndexer()

    await mockStakingToken.givenMethodReturnBool(mockStakingToken_approve, true)

    delegate = await DelegateV2.new(
      mockSwap.address,
      mockIndexer.address,
      ADDRESS_ZERO,
      tradeWallet,
      PROTOCOL
    )
  })

  describe('Test constructor', async () => {
    it('Test initial Swap Contract', async () => {
      const val = await delegate.swapContract.call()
      equal(val, swapAddress, 'swap address is incorrect')
    })

    it('Test initial trade wallet value', async () => {
      const val = await delegate.tradeWallet.call()
      equal(val, tradeWallet, 'trade wallet is incorrect')
    })

    it('Test initial protocol value', async () => {
      const val = await delegate.protocol.call()
      equal(val, PROTOCOL, 'protocol is incorrect')
    })

    it('Test constructor sets the owner as the trade wallet on empty address', async () => {
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      const newDelegate = await DelegateV2.new(
        swapAddress,
        mockIndexer.address,
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        PROTOCOL,
        {
          from: owner,
        }
      )

      const val = await newDelegate.tradeWallet.call()
      equal(val, owner, 'trade wallet is incorrect')
    })

    it('Test owner is set correctly having been provided an empty address', async () => {
      const val = await delegate.owner.call()
      equal(val, owner, 'owner is incorrect - should be owner')
    })

    it('Test owner is set correctly if provided an address', async () => {
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      const newDelegate = await DelegateV2.new(
        swapAddress,
        mockIndexer.address,
        notOwner,
        tradeWallet,
        PROTOCOL,
        {
          from: owner,
        }
      )

      // being provided an empty address, it should leave the owner unchanged
      const val = await newDelegate.owner.call()
      equal(val, notOwner, 'owner is incorrect - should be notOwner')
    })

    it('Test indexer is unable to pull funds from delegate account', async () => {
      //force approval to fail
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        false
      )

      await reverted(
        DelegateV2.new(
          swapAddress,
          mockIndexer.address,
          ADDRESS_ZERO,
          ADDRESS_ZERO,
          PROTOCOL,
          {
            from: owner,
          }
        ),
        'STAKING_APPROVAL_FAILED'
      )
    })
  })
})
