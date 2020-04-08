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
const { equal, emitted, reverted } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { GANACHE_PROVIDER } = require('@airswap/test-utils').constants

contract('DelegateV2 Unit Tests', async accounts => {
  const owner = accounts[0]
  const tradeWallet = accounts[1]
  const mockRegistry = accounts[2]
  const notOwner = accounts[3]
  const aliceAddress = accounts[4]

  const aliceSigner = new ethers.providers.JsonRpcProvider(
    GANACHE_PROVIDER
  ).getSigner(aliceAddress)

  const PROTOCOL = '0x0006'

  const NO_RULE = 0

  let swap_swap
  let mockSwap
  let swapAddress
  let mockIndexer
  let snapshotId
  let mockStakingToken
  let mockFungibleTokenTemplate
  let mockToken_approve
  let mockToken_allowance
  let mockToken_balanceOf
  let SENDER_TOKEN
  let SENDER_TOKEN_ADDR
  let SIGNER_TOKEN
  let SIGNER_TOKEN_ADDR

  let delegate

  async function checkLinkedList(senderToken, signerToken, correctIDs) {
    // pad correctIDs with null values for null pointers
    correctIDs = [0].concat(correctIDs).concat([0])

    // get the first rule: rule 3. Now iterate through the rules using 'nextRuleID'
    let ruleID = await delegate.firstRuleID.call(senderToken, signerToken)
    let rule

    // loop through the list in the contract, checking it is correctly ordered
    for (let i = 1; i <= correctIDs.length - 2; i++) {
      // check the ruleID is right
      equal(
        ruleID,
        correctIDs[i],
        'Link list rule wrong. Should be: ' +
          correctIDs[i] +
          ' but got: ' +
          ruleID
      )
      // fetch the rule, and from that the next rule/previous rule
      rule = await delegate.rules.call(ruleID)
      equal(
        rule['prevRuleID'].toNumber(),
        correctIDs[i - 1],
        'prev rule incorrectly set'
      )
      equal(
        rule['nextRuleID'].toNumber(),
        correctIDs[i + 1],
        'next rule incorrectly set'
      )
      ruleID = rule['nextRuleID'].toNumber()
    }
  }

  async function setupMockTokens() {
    mockStakingToken = await MockContract.new()
    SENDER_TOKEN = await MockContract.new()
    SIGNER_TOKEN = await MockContract.new()
    mockFungibleTokenTemplate = await FungibleToken.new()

    SENDER_TOKEN_ADDR = SENDER_TOKEN.address
    SIGNER_TOKEN_ADDR = SIGNER_TOKEN.address

    mockToken_approve = await mockFungibleTokenTemplate.contract.methods
      .approve(ADDRESS_ZERO, 0)
      .encodeABI()
    mockToken_allowance = await mockFungibleTokenTemplate.contract.methods
      .allowance(ADDRESS_ZERO, ADDRESS_ZERO)
      .encodeABI()
    mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
      .balanceOf(ADDRESS_ZERO)
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
    await setupMockTokens()
    await setupMockIndexer()

    await mockStakingToken.givenMethodReturnBool(mockToken_approve, true)

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
      await mockStakingToken.givenMethodReturnBool(mockToken_approve, true)

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
      await mockStakingToken.givenMethodReturnBool(mockToken_approve, true)

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
      await mockStakingToken.givenMethodReturnBool(mockToken_approve, false)

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
        delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 0, 400),
        'AMOUNTS_CANNOT_BE_0'
      )

      await reverted(
        delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 400, 0),
        'AMOUNTS_CANNOT_BE_0'
      )
    })

    it('Should successfully create a rule and update the contract', async () => {
      const tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        1000,
        200
      )

      // check it's stored in the mapping correctly
      const rule = await delegate.rules.call(1)

      equal(
        rule['senderToken'],
        SENDER_TOKEN_ADDR,
        'sender token incorrectly set'
      )
      equal(
        rule['signerToken'],
        SIGNER_TOKEN_ADDR,
        'signer token incorrectly set'
      )
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
      const ruleID = await delegate.firstRuleID.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      equal(ruleID, 1, 'Link list first rule ID incorrect')
      const activeRules = await delegate.totalActiveRules.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
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
          e.senderToken === SENDER_TOKEN_ADDR &&
          e.signerToken === SIGNER_TOKEN_ADDR &&
          e.senderAmount.toNumber() === 1000 &&
          e.signerAmount.toNumber() === 200
        )
      })
    })

    it('Should successfully insert a second rule at the beginning of the same market', async () => {
      // insert the first rule, as in the previous test
      // in this rule, every 1 signerToken gets 5 senderTokens
      let tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        1000,
        200
      )

      emitted(tx, 'CreateRule')

      // now insert another rule on the same token pair
      // in this rule every 1 signerToken gets 6 senderTokens
      // this rule therefore goes BEFORE the other rule in the list
      tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        300,
        50
      )

      // check the event emitted correctly
      emitted(tx, 'CreateRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === 2 &&
          e.senderToken === SENDER_TOKEN_ADDR &&
          e.signerToken === SIGNER_TOKEN_ADDR &&
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
      const ruleID = await delegate.firstRuleID.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      equal(ruleID, 2, 'Link list first rule ID incorrect')
      const activeRules = await delegate.totalActiveRules.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      equal(activeRules, 2, 'Total active rules incorrect')

      // check the contract's total rules created is correct
      const ruleCounter = await delegate.ruleIDCounter.call()
      equal(ruleCounter, 2, 'Rule counter incorrect')
    })

    it('Should successfully insert 5 rules to the same market', async () => {
      // RULE 1: in this rule every 1 signerToken gets 6 senderTokens
      let tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        300,
        50
      )
      emitted(tx, 'CreateRule')

      // RULE 2: in this rule, every 1 signerToken gets 5 senderTokens
      tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        1000,
        200
      )
      emitted(tx, 'CreateRule')

      // RULE 3: in this rule, every 1 signerToken gets 7 senderTokens
      tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        2002,
        286
      )
      emitted(tx, 'CreateRule')

      // RULE 4: in this rule, every 1 signerToken gets 4.5 senderTokens
      tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        450,
        100
      )
      emitted(tx, 'CreateRule')

      // RULE 5: in this rule, every 1 signerToken gets 5.2 senderTokens
      tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        1664,
        320
      )
      emitted(tx, 'CreateRule')

      // CORRECT RULE ORDER: 3, 1, 5, 2, 4
      await checkLinkedList(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, [
        3,
        1,
        5,
        2,
        4,
      ])

      const activeRules = await delegate.totalActiveRules.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      equal(activeRules, 5, 'Total active rules incorrect')

      // check the contract's total rules created is correct
      const ruleCounter = await delegate.ruleIDCounter.call()
      equal(ruleCounter, 5, 'Rule counter incorrect')
    })

    it('Should successfully insert 2 rules with the same price', async () => {
      let tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        300,
        50
      )
      emitted(tx, 'CreateRule')

      // this rule has the same price: 1 signer token => 6 sender tokens
      tx = await delegate.createRule(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        1200,
        200
      )
      emitted(tx, 'CreateRule')

      // assert the new rule is AFTER the original rule
      await checkLinkedList(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, [1, 2])
    })
  })

  describe('Test deleteRule', async () => {
    const correctIDs = [3, 1, 5, 2, 4] // surrounded by null pointers

    beforeEach(async () => {
      // add 5 rules - same rules as test above
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 300, 50)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1000, 200)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 2002, 286)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 450, 100)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1664, 320)
      // CORRECT RULE ORDER: 3, 1, 5, 2, 4
    })

    it('Should not delete a non-existent rule', async () => {
      await reverted(
        delegate.deleteRule(correctIDs.length + 1),
        'RULE_NOT_ACTIVE'
      )
    })

    it('Should delete the last rule in the list', async () => {
      const tx = await delegate.deleteRule(correctIDs[correctIDs.length - 1])

      // check the event emitted correctly
      emitted(tx, 'DeleteRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === correctIDs[correctIDs.length - 1]
        )
      })

      await checkLinkedList(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        correctIDs.slice(0, correctIDs.length - 1)
      )

      const activeRules = await delegate.totalActiveRules.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      equal(activeRules, correctIDs.length - 1, 'Total active rules incorrect')
    })

    it('Should delete the first rule in the list', async () => {
      const tx = await delegate.deleteRule(correctIDs[0])

      // check the event emitted correctly
      emitted(tx, 'DeleteRule', e => {
        return e.owner === owner && e.ruleID.toNumber() === correctIDs[0]
      })

      await checkLinkedList(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        correctIDs.slice(1)
      )

      const activeRules = await delegate.totalActiveRules.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      equal(activeRules, correctIDs.length - 1, 'Total active rules incorrect')
    })

    it('Should delete the middle rule in the list', async () => {
      const tx = await delegate.deleteRule(correctIDs[2])

      // check the event emitted correctly
      emitted(tx, 'DeleteRule', e => {
        return e.owner === owner && e.ruleID.toNumber() === correctIDs[2]
      })

      await checkLinkedList(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR,
        correctIDs.slice(0, 2).concat(correctIDs.slice(3))
      )

      const activeRules = await delegate.totalActiveRules.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      equal(activeRules, correctIDs.length - 1, 'Total active rules incorrect')
    })
  })

  describe('Test getSignerSideQuote', async () => {
    beforeEach(async () => {
      // add 5 rules - same rules as test above
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 300, 50)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1000, 200)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 2002, 286)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 450, 100)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1664, 320)
      // CORRECT RULE ORDER: 3, 1, 5, 2, 4
    })

    it('Should return 0 for a market with no rules', async () => {
      const signerAmount = await delegate.getSignerSideQuote.call(
        1,
        SIGNER_TOKEN_ADDR,
        SENDER_TOKEN_ADDR
      )

      equal(signerAmount, 0, 'signer amount should be 0')
    })

    it('Should return a quote that just involves the smallest rule', async () => {
      const signerAmount = await delegate.getSignerSideQuote.call(
        700,
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )

      equal(
        signerAmount.toNumber(),
        (700 * 286) / 2002,
        'signer amount incorrect'
      )
    })

    it('Should return a quote that uses multiple rules', async () => {
      // entirety of 3 rules, plus some more = 2002 (r3) + 300 (r1) + 833 (r5)
      const signerAmount = await delegate.getSignerSideQuote.call(
        3135,
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )

      // result should round up so its in the delegate's advantage
      // therefore it should round up
      equal(
        signerAmount.toNumber(),
        Math.ceil(286 + 50 + 320 * (833 / 1664)),
        'signer amount incorrect'
      )
    })

    it('Should allow a quote for the maximum sender amount', async () => {
      // total sender amount in rules is 5416, and signer amounts is 956
      const signerAmount = await delegate.getSignerSideQuote.call(
        5416,
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )

      equal(signerAmount.toNumber(), 956, 'signer amount incorrect')
    })

    it('Should return 0 for a sender amount more than the total', async () => {
      // total sender amount in rules is 5416
      const signerAmount = await delegate.getSignerSideQuote.call(
        5417,
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )

      equal(signerAmount.toNumber(), 0, 'signer amount should be 0')
    })
  })

  describe('Test getSenderSideQuote', async () => {
    beforeEach(async () => {
      // add 5 rules - same rules as test above
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 300, 50)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1000, 200)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 2002, 286)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 450, 100)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1664, 320)
      // CORRECT RULE ORDER: 3, 1, 5, 2, 4
    })

    it('Should return 0 for a market with no rules', async () => {
      const senderAmount = await delegate.getSenderSideQuote.call(
        1,
        SIGNER_TOKEN_ADDR,
        SENDER_TOKEN_ADDR
      )

      equal(senderAmount, 0, 'sender amount should be 0')
    })

    it('Should return a quote that just involves the smallest rule', async () => {
      const senderAmount = await delegate.getSenderSideQuote.call(
        84,
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )

      equal(
        senderAmount.toNumber(),
        (84 * 2002) / 286,
        'sender amount incorrect'
      )
    })

    it('Should return a quote that uses multiple rules', async () => {
      // entirety of 4 rules, plus some = 286 (r3) + 50 (r1) + 320 (r5) + 200 (r2) + 5 (r4)
      const senderAmount = await delegate.getSenderSideQuote.call(
        861,
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )

      equal(
        senderAmount.toNumber(),
        Math.floor(2002 + 300 + 1664 + 1000 + 450 / 20),
        'sender amount incorrect'
      )
    })

    it('Should allow a quote for the maximum signer amount', async () => {
      // total sender amount in rules is 5416, and signer amounts is 956
      const senderAmount = await delegate.getSenderSideQuote.call(
        956,
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )

      equal(senderAmount.toNumber(), 5416, 'sender amount incorrect')
    })

    it('Should return max sender amount for even larger signer amounts', async () => {
      // total sender amount in rules is 5416, and signer amounts is 956
      const senderAmount = await delegate.getSenderSideQuote.call(
        1000, // bigger than the total of the rules
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )

      // returns max sender amount as this rate change is in the delegate's favour
      equal(senderAmount.toNumber(), 5416, 'sender amount incorrect')
    })
  })

  describe('Test getMaxQuote', async () => {
    beforeEach(async () => {
      // add 2 rules - same rules as test above
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 300, 50)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1000, 200)
    })

    it('Should return 0 if the trade wallet has no tokens', async () => {
      await SENDER_TOKEN.givenMethodReturnUint(mockToken_balanceOf, 0)
      await SENDER_TOKEN.givenMethodReturnUint(mockToken_allowance, 0)

      const result = await delegate.getMaxQuote.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      const senderAmount = result['senderAmount']
      const signerAmount = result['signerAmount']

      equal(senderAmount, 0, 'sender amount should be 0')
      equal(signerAmount, 0, 'signer amount should be 0')
    })

    it('Should return the maximum if the trade wallet has ample tokens', async () => {
      await SENDER_TOKEN.givenMethodReturnUint(mockToken_balanceOf, 1000000)
      await SENDER_TOKEN.givenMethodReturnUint(mockToken_allowance, 1000000)

      const result = await delegate.getMaxQuote.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      const senderAmount = result['senderAmount']
      const signerAmount = result['signerAmount']

      equal(senderAmount, 1300, 'sender amount incorrect')
      equal(signerAmount, 250, 'signer amount incorrect')
    })

    it('Should return a smaller quote if the balance is low', async () => {
      await SENDER_TOKEN.givenMethodReturnUint(mockToken_balanceOf, 1000)
      await SENDER_TOKEN.givenMethodReturnUint(mockToken_allowance, 1000000)

      const result = await delegate.getMaxQuote.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      const senderAmount = result['senderAmount']
      const signerAmount = result['signerAmount']

      equal(senderAmount, 1000, 'sender amount incorrect')
      equal(signerAmount, 50 + (200 * 700) / 1000, 'signer amount incorrect')
    })

    it('Should return a smaller quote if the allowance is low', async () => {
      await SENDER_TOKEN.givenMethodReturnUint(mockToken_balanceOf, 1000000)
      await SENDER_TOKEN.givenMethodReturnUint(mockToken_allowance, 504)

      const result = await delegate.getMaxQuote.call(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      const senderAmount = result['senderAmount']
      const signerAmount = result['signerAmount']

      equal(senderAmount, 504, 'sender amount incorrect')
      equal(
        signerAmount,
        50 + Math.ceil((200 * 204) / 1000),
        'signer amount incorrect'
      )
    })
  })

  describe('Test getLevels', async () => {
    beforeEach(async () => {
      // add 5 rules - same rules as test above
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 300, 50)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1000, 200)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 2002, 286)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 450, 100)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1664, 320)
      // CORRECT RULE ORDER: 3, 1, 5, 2, 4
    })

    it('Should return no levels if none exist', async () => {
      const result = await delegate.getLevels(
        SIGNER_TOKEN_ADDR,
        SENDER_TOKEN_ADDR
      )

      equal(
        result['senderAmounts'].length,
        0,
        'There should be no sender amounts'
      )
      equal(
        result['signerAmounts'].length,
        0,
        'There should be no signer amounts'
      )
    })

    it('Should return all levels in order', async () => {
      const result = await delegate.getLevels(
        SENDER_TOKEN_ADDR,
        SIGNER_TOKEN_ADDR
      )
      const senderAmounts = result['senderAmounts'].map(x => x.toNumber())
      const signerAmounts = result['signerAmounts'].map(x => x.toNumber())
      const expectedSenderAmounts = [2002, 300, 1664, 1000, 450]
      const expectedSignerAmounts = [286, 50, 320, 200, 100]

      for (let i = 0; i < expectedSenderAmounts.length; i++) {
        equal(
          senderAmounts[i],
          expectedSenderAmounts[i],
          'Sender amount incorrect'
        )
        equal(
          signerAmounts[i],
          expectedSignerAmounts[i],
          'Signer amount incorrect'
        )
      }
    })
  })

  describe('Test provideOrder', async () => {
    beforeEach(async () => {
      // add 5 rules - same rules as test above
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 300, 50)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1000, 200)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 2002, 286)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 450, 100)
      await delegate.createRule(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, 1664, 320)
      // CORRECT RULE ORDER: 3, 1, 5, 2, 4
    })

    it('Should fail if no signature is sent', async () => {
      const order = createOrder({
        signer: {
          wallet: aliceAddress,
          amount: 500,
          token: SIGNER_TOKEN_ADDR,
        },
        sender: {
          wallet: tradeWallet,
          amount: 500,
          token: SENDER_TOKEN_ADDR,
        },
      })

      order.signature = emptySignature

      // Succeeds on the Delegate, fails on the Swap.
      await reverted(
        delegate.provideOrder(order, { from: notOwner }),
        'SIGNATURE_MUST_BE_SENT'
      )
    })

    it('Should fail if sender token is not ERC20', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 500,
            token: SIGNER_TOKEN_ADDR,
          },
          sender: {
            wallet: tradeWallet,
            amount: 500,
            token: SENDER_TOKEN_ADDR,
            kind: '0x80ac58cd',
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: aliceAddress,
        }),
        'SENDER_KIND_MUST_BE_ERC20'
      )
    })

    it('Should fail if signer token is not ERC20', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 500,
            token: SIGNER_TOKEN_ADDR,
            kind: '0x80ac58cd',
          },
          sender: {
            wallet: tradeWallet,
            amount: 500,
            token: SENDER_TOKEN_ADDR,
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: aliceAddress,
        }),
        'SIGNER_KIND_MUST_BE_ERC20'
      )
    })

    it('Should fail if the sender wallet is not the tradeWallet', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 500,
            token: SIGNER_TOKEN_ADDR,
          },
          sender: {
            wallet: notOwner,
            amount: 500,
            token: SENDER_TOKEN_ADDR,
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: aliceAddress,
        }),
        'SENDER_WALLET_INVALID'
      )
    })

    it('Should fail if there are no rules for the given token pair', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 500,
            token: SENDER_TOKEN_ADDR,
          },
          sender: {
            wallet: tradeWallet,
            amount: 500,
            token: SIGNER_TOKEN_ADDR,
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: aliceAddress,
        }),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('Should accept an order that partially fills the first rule', async () => {
      // the first rule is SENDER_TOKEN 2002, SIGNER_TOKEN 286 -> this is 1:7
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 100,
            token: SIGNER_TOKEN_ADDR,
          },
          sender: {
            wallet: tradeWallet,
            amount: 700,
            token: SENDER_TOKEN_ADDR,
          },
        }),
        aliceSigner,
        swapAddress
      )

      const tx = await delegate.provideOrder(order, {
        from: aliceAddress,
      })
      emitted(tx, 'FillRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === 3 &&
          e.senderAmount.toNumber() === 700 &&
          e.signerAmount.toNumber() === 100
        )
      })

      // now check the rule is updated
      const rule = await delegate.rules.call(3)
      equal(
        rule['senderAmount'].toNumber(),
        2002 - 700,
        'sender amount incorrectly set'
      )
      equal(
        rule['signerAmount'].toNumber(),
        286 - 100,
        'signer amount incorrectly set'
      )

      // check the linked list is still in tact
      await checkLinkedList(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, [
        3,
        1,
        5,
        2,
        4,
      ])

      // check swap was called
      const invocationCount = await mockSwap.invocationCountForMethod.call(
        swap_swap
      )
      equal(invocationCount, 1, 'swap function was not called')
    })

    it('Should accept an order that fills multiple rules - rules deleted', async () => {
      // fills first 2 rules and half of 3rd: 2002+300+(0.5*1664) and 286+50+(0.5*320)
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 496,
            token: SIGNER_TOKEN_ADDR,
          },
          sender: {
            wallet: tradeWallet,
            amount: 3134,
            token: SENDER_TOKEN_ADDR,
          },
        }),
        aliceSigner,
        swapAddress
      )

      const tx = await delegate.provideOrder(order, {
        from: aliceAddress,
      })
      // fill and delete for rule 3
      emitted(tx, 'FillRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === 3 &&
          e.senderAmount.toNumber() === 2002 &&
          e.signerAmount.toNumber() === 286
        )
      })
      emitted(tx, 'DeleteRule', e => {
        return e.owner === owner && e.ruleID.toNumber() === 3
      })

      // fill and delete for rule 1
      emitted(tx, 'FillRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === 1 &&
          e.senderAmount.toNumber() === 300 &&
          e.signerAmount.toNumber() === 50
        )
      })
      emitted(tx, 'DeleteRule', e => {
        return e.owner === owner && e.ruleID.toNumber() === 1
      })

      // partial fill for rule 5
      emitted(tx, 'FillRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === 5 &&
          e.senderAmount.toNumber() === 832 &&
          e.signerAmount.toNumber() === 160
        )
      })

      // check the linked list - 3 and 1 now gone
      await checkLinkedList(SENDER_TOKEN_ADDR, SIGNER_TOKEN_ADDR, [5, 2, 4])

      // check swap was called
      const invocationCount = await mockSwap.invocationCountForMethod.call(
        swap_swap
      )
      equal(invocationCount, 1, 'swap function was not called')
    })

    it('Should reject an order thats priced to the signers advantage', async () => {
      // same amounts as the previous test, but 1 more sender token
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 496,
            token: SIGNER_TOKEN_ADDR,
          },
          sender: {
            wallet: tradeWallet,
            amount: 3135,
            token: SENDER_TOKEN_ADDR,
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: aliceAddress,
        }),
        'PRICE_INVALID'
      )
    })

    it('Should accept an order thats priced to the delegates advantage', async () => {
      // again same amount as the test 2 above, but 1 more sender token
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 497,
            token: SIGNER_TOKEN_ADDR,
          },
          sender: {
            wallet: tradeWallet,
            amount: 3134,
            token: SENDER_TOKEN_ADDR,
          },
        }),
        aliceSigner,
        swapAddress
      )

      const tx = await delegate.provideOrder(order, {
        from: aliceAddress,
      })

      // we know rules 3 and 1 will have filled in entirety
      // the partial fill for rule 5 sticks to the rule ratio
      // the extra token sent is not included in the rule fill
      emitted(tx, 'FillRule', e => {
        return (
          e.owner === owner &&
          e.ruleID.toNumber() === 5 &&
          e.senderAmount.toNumber() === 832 &&
          e.signerAmount.toNumber() === 160
        )
      })
    })

    it('Should reject an order that fills the sender but not signer of a rule', async () => {
      // fills the first rule's sender amount but not signer amount
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            amount: 285,
            token: SIGNER_TOKEN_ADDR,
          },
          sender: {
            wallet: tradeWallet,
            amount: 2002,
            token: SENDER_TOKEN_ADDR,
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: aliceAddress,
        }),
        'PRICE_INVALID'
      )
    })
  })
})
