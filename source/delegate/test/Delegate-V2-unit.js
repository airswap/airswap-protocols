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

contract('DelegateV2 Unit Tests', async accounts => {
  const owner = accounts[0]
  const tradeWallet = accounts[1]
  const mockTokenOne = accounts[2]
  const mockTokenTwo = accounts[3]
  const mockRegistry = accounts[4]
  const notOwner = accounts[4]

  const PROTOCOL = '0x0006'

  const NO_RULE = 0

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

  describe('Test createRule', async () => {
    it('Should not create a rule with a 0 amount', async () => {
      await reverted(
        delegate.createRule(mockTokenOne, mockTokenTwo, 0, 400),
        'AMOUNTS_CANNOT_BE_0'
      )

      await reverted(
        delegate.createRule(mockTokenOne, mockTokenTwo, 400, 0),
        'AMOUNTS_CANNOT_BE_0'
      )
    })

    it('Should successfully create a rule and update the contract', async () => {
      const tx = await delegate.createRule(
        mockTokenOne,
        mockTokenTwo,
        1000,
        200
      )

      // check it's stored in the mapping correctly
      const rule = await delegate.rules.call(1)

      equal(rule['senderToken'], mockTokenOne, 'sender token incorrectly set')
      equal(rule['signerToken'], mockTokenTwo, 'signer token incorrectly set')
      equal(
        rule['senderAmount'].toNumber(),
        1000,
        'sender amount incorrectly set'
      )
      equal(
        rule['signerAmount'].toNumber(),
        200,
        'signer amount incorrectly set'
      )
      equal(rule['prevRuleID'].toNumber(), NO_RULE, 'prev rule incorrectly set')
      equal(rule['nextRuleID'].toNumber(), NO_RULE, 'next rule incorrectly set')

      // check the token pair's list was updated correctly
      const ruleID = await delegate.firstRuleID.call(mockTokenOne, mockTokenTwo)
      equal(ruleID, 1, 'Link list first rule ID incorrect')
      const activeRules = await delegate.totalActiveRules.call(
        mockTokenOne,
        mockTokenTwo
      )
      equal(activeRules, 1, 'Total active rules incorrect')

      // check the contract's total rules created is correct
      const ruleCounter = await delegate.ruleIDCounter.call()
      equal(ruleCounter, 1, 'Rule counter incorrect')

      // check the event emitted correctly
      emitted(tx, 'CreateRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === 1 &&
          e.senderToken === mockTokenOne &&
          e.signerToken === mockTokenTwo &&
          e.senderAmount.toNumber() === 1000 &&
          e.signerAmount.toNumber() === 200
        )
      })
    })

    it('Should successfully insert a second rule at the beginning of the same market', async () => {
      // insert the first rule, as in the previous test
      // in this rule, every 1 signerToken gets 5 senderTokens
      let tx = await delegate.createRule(mockTokenOne, mockTokenTwo, 1000, 200)

      emitted(tx, 'CreateRule')

      // now insert another rule on the same token pair
      // in this rule every 1 signerToken gets 6 senderTokens
      // this rule therefore goes BEFORE the other rule in the list
      tx = await delegate.createRule(mockTokenOne, mockTokenTwo, 300, 50)

      // check the event emitted correctly
      emitted(tx, 'CreateRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === 2 &&
          e.senderToken === mockTokenOne &&
          e.signerToken === mockTokenTwo &&
          e.senderAmount.toNumber() === 300 &&
          e.signerAmount.toNumber() === 50
        )
      })

      let rule = await delegate.rules.call(1)
      // check it is updated to now be after the new rule
      equal(rule['prevRuleID'].toNumber(), 2, 'prev rule incorrectly set')
      equal(rule['nextRuleID'].toNumber(), NO_RULE, 'next rule incorrectly set')
      rule = await delegate.rules.call(2)
      equal(rule['prevRuleID'].toNumber(), NO_RULE, 'prev rule incorrectly set')
      equal(rule['nextRuleID'].toNumber(), 1, 'next rule incorrectly set')

      // check that rule 2 is now the first rule in the market's list
      const ruleID = await delegate.firstRuleID.call(mockTokenOne, mockTokenTwo)
      equal(ruleID, 2, 'Link list first rule ID incorrect')
      const activeRules = await delegate.totalActiveRules.call(
        mockTokenOne,
        mockTokenTwo
      )
      equal(activeRules, 2, 'Total active rules incorrect')

      // check the contract's total rules created is correct
      const ruleCounter = await delegate.ruleIDCounter.call()
      equal(ruleCounter, 2, 'Rule counter incorrect')
    })
  })
})
