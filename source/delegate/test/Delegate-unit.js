const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Indexer = artifacts.require('Indexer')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')

const { ethers } = require('ethers')
const { ADDRESS_ZERO, LOCATOR_ZERO } = require('@airswap/constants')
const { createOrder, signOrder } = require('@airswap/utils')
const {
  equal,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const PROVIDER_URL = web3.currentProvider.host

contract('Delegate Unit Tests', async accounts => {
  const owner = accounts[0]
  const tradeWallet = accounts[1]
  const notOwner = accounts[2]
  const notTradeWallet = accounts[3]
  const SIGNER_TOKEN = accounts[4]
  const SENDER_TOKEN = accounts[5]
  const MOCK_WETH = accounts[6]
  const MOCK_DAI = accounts[7]
  const mockRegistry = accounts[8]
  const MAX_SENDER_AMOUNT = 12345
  const PRICE_COEF = 4321
  const EXP = 2
  const EMPTY_PROTOCOL = '0x0000'
  const DELE_PROTOCOL = '0x0002'
  let mockFungibleTokenTemplate
  let delegate
  let mockSwap
  let swapAddress
  let snapshotId
  let swapFunction
  let mockStakingToken
  let mockStakingToken_allowance
  let mockStakingToken_transferFrom
  let mockStakingToken_transfer
  let mockStakingToken_approve
  let mockIndexer
  let mockIndexer_getStakedAmount

  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)
  const notOwnerSigner = provider.getSigner(notOwner)

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  async function setupMockTokens() {
    mockStakingToken = await MockContract.new()
    mockFungibleTokenTemplate = await FungibleToken.new()

    mockStakingToken_allowance = await mockFungibleTokenTemplate.contract.methods
      .allowance(ADDRESS_ZERO, ADDRESS_ZERO)
      .encodeABI()

    mockStakingToken_transferFrom = await mockFungibleTokenTemplate.contract.methods
      .transferFrom(ADDRESS_ZERO, ADDRESS_ZERO, 0)
      .encodeABI()

    mockStakingToken_transfer = await mockFungibleTokenTemplate.contract.methods
      .transfer(ADDRESS_ZERO, 0)
      .encodeABI()

    mockStakingToken_approve = await mockFungibleTokenTemplate.contract.methods
      .approve(ADDRESS_ZERO, 0)
      .encodeABI()
  }

  async function setupMockSwap() {
    const types = await Types.new()
    await Swap.link('Types', types.address)
    const swapTemplate = await Swap.new(mockRegistry)
    const order = await createOrder({})
    order.signature = {
      signatory: ADDRESS_ZERO,
      validator: ADDRESS_ZERO,
      version: '0x00',
      v: '0',
      r: LOCATOR_ZERO,
      s: LOCATOR_ZERO,
    }
    swapFunction = swapTemplate.contract.methods.swap(order).encodeABI()

    mockSwap = await MockContract.new()
    swapAddress = mockSwap.address
  }

  async function setupMockIndexer() {
    mockIndexer = await MockContract.new()
    const mockIndexerTemplate = await Indexer.new(ADDRESS_ZERO)

    //mock setIntent()
    const mockIndexer_setIntent = mockIndexerTemplate.contract.methods
      .setIntent(
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        EMPTY_PROTOCOL,
        0,
        web3.utils.fromAscii('')
      )
      .encodeABI()
    await mockIndexer.givenMethodReturnBool(mockIndexer_setIntent, true)

    //mock unsetIntent()
    const mockIndexer_unsetIntent = mockIndexerTemplate.contract.methods
      .unsetIntent(ADDRESS_ZERO, ADDRESS_ZERO, EMPTY_PROTOCOL)
      .encodeABI()
    await mockIndexer.givenMethodReturnBool(mockIndexer_unsetIntent, true)

    //mock stakingToken()
    const mockIndexer_stakingToken = mockIndexerTemplate.contract.methods
      .stakingToken()
      .encodeABI()
    await mockIndexer.givenMethodReturnAddress(
      mockIndexer_stakingToken,
      mockStakingToken.address
    )

    //mock getStakedAmount()
    mockIndexer_getStakedAmount = mockIndexerTemplate.contract.methods
      .getStakedAmount(ADDRESS_ZERO, ADDRESS_ZERO, ADDRESS_ZERO, EMPTY_PROTOCOL)
      .encodeABI()
  }

  before('deploy Delegate', async () => {
    await setupMockTokens()
    await setupMockSwap()
    await setupMockIndexer()

    await mockStakingToken.givenMethodReturnBool(mockStakingToken_approve, true)

    delegate = await Delegate.new(
      swapAddress,
      mockIndexer.address,
      ADDRESS_ZERO,
      tradeWallet,
      DELE_PROTOCOL,
      {
        from: owner,
      }
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
      equal(val, DELE_PROTOCOL, 'protocol is incorrect')
    })

    it('Test constructor sets the owner as the trade wallet on empty address', async () => {
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      const newDelegate = await Delegate.new(
        swapAddress,
        mockIndexer.address,
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        DELE_PROTOCOL,
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

      const newDelegate = await Delegate.new(
        swapAddress,
        mockIndexer.address,
        notOwner,
        tradeWallet,
        DELE_PROTOCOL,
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
        Delegate.new(
          swapAddress,
          mockIndexer.address,
          ADDRESS_ZERO,
          ADDRESS_ZERO,
          DELE_PROTOCOL,
          {
            from: owner,
          }
        ),
        'STAKING_APPROVAL_FAILED'
      )
    })
  })

  describe('Test setRule', async () => {
    it('Test setRule permissions as not owner', async () => {
      await reverted(
        delegate.setRule(
          SENDER_TOKEN,
          SIGNER_TOKEN,
          MAX_SENDER_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: notOwner }
        ),
        'Ownable: caller is not the owner'
      )
    })

    it('Test setRule permissions as owner', async () => {
      await passes(
        delegate.setRule(
          SENDER_TOKEN,
          SIGNER_TOKEN,
          MAX_SENDER_AMOUNT,
          PRICE_COEF,
          EXP,
          { from: owner }
        )
      )
    })

    it('Test setRule', async () => {
      const trx = await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //check if rule has been added
      const rule = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        rule[0].toNumber(),
        MAX_SENDER_AMOUNT,
        'max delegate amount is incorrectly saved'
      )
      equal(rule[1].toNumber(), PRICE_COEF, 'price coef is incorrectly saved')
      equal(rule[2].toNumber(), EXP, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'SetRule', e => {
        return (
          e.signerToken === SIGNER_TOKEN &&
          e.senderToken === SENDER_TOKEN &&
          e.maxSenderAmount.toNumber() === MAX_SENDER_AMOUNT &&
          e.priceCoef.toNumber() === PRICE_COEF &&
          e.priceExp.toNumber() === EXP
        )
      })
    })

    it('Test setRule for zero priceCoef does revert', async () => {
      const trx = delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        0,
        EXP
      )
      await reverted(trx, 'PRICE_COEF_INVALID')
    })
  })

  describe('Test unsetRule', async () => {
    it('Test unsetRule permissions as not owner', async () => {
      await reverted(
        delegate.unsetRule(SENDER_TOKEN, SIGNER_TOKEN, { from: notOwner })
      )
    })

    it('Test unsetRule permissions', async () => {
      await passes(
        delegate.unsetRule(SENDER_TOKEN, SIGNER_TOKEN, { from: owner })
      )
    })

    it('Test unsetRule', async () => {
      let trx = await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //ensure rule has been added
      const ruleBefore = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleBefore[0].toNumber(),
        MAX_SENDER_AMOUNT,
        'max delegate amount is incorrectly saved'
      )

      trx = await delegate.unsetRule(SENDER_TOKEN, SIGNER_TOKEN)

      //check that the rule has been removed
      const ruleAfter = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        0,
        'max delgate amount is incorrectly saved'
      )
      equal(ruleAfter[1].toNumber(), 0, 'price coef is incorrectly saved')
      equal(ruleAfter[2].toNumber(), 0, 'price exp is incorrectly saved')

      //check emitted event
      emitted(trx, 'UnsetRule', e => {
        return e.senderToken === SENDER_TOKEN && e.signerToken === SIGNER_TOKEN
      })
    })
  })

  describe('Test setRuleAndIntent()', async () => {
    it('Test calling setRuleAndIntent with transfer error', async () => {
      const stakeAmount = 250

      const rule = [100000, 300, 0]

      await mockStakingToken.givenMethodReturnUint(
        mockStakingToken_allowance,
        stakeAmount
      )
      //mock unsuccessful transfer
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_transferFrom,
        false
      )

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(mockIndexer_getStakedAmount, 0)

      await reverted(
        delegate.setRuleAndIntent(MOCK_WETH, MOCK_DAI, rule, stakeAmount),
        'STAKING_TRANSFER_FAILED'
      )
    })

    it('Test successfully calling setRuleAndIntent with 0 staked amount', async () => {
      const stakeAmount = 0

      const rule = [100000, 300, 0]

      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(mockIndexer_getStakedAmount, 0)

      await passes(
        delegate.setRuleAndIntent(MOCK_WETH, MOCK_DAI, rule, stakeAmount)
      )
    })

    it('Test successfully calling setRuleAndIntent with staked amount', async () => {
      const stakeAmount = 250

      const rule = [100000, 300, 0]

      await mockStakingToken.givenMethodReturnUint(
        mockStakingToken_allowance,
        stakeAmount
      )
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_transferFrom,
        true
      )
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(mockIndexer_getStakedAmount, 250)

      await passes(
        delegate.setRuleAndIntent(MOCK_WETH, MOCK_DAI, rule, stakeAmount)
      )
    })

    it('Test unsuccessfully calling setRuleAndIntent with decreased staked amount', async () => {
      const stakeAmount = 100

      const rule = [100000, 300, 0]

      await mockStakingToken.givenMethodReturnUint(
        mockStakingToken_allowance,
        stakeAmount
      )
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_transferFrom,
        true
      )

      const transferToDelegateOwner = mockFungibleTokenTemplate.contract.methods
        .transfer(accounts[0], 150)
        .encodeABI()

      await mockStakingToken.givenCalldataReturnBool(
        transferToDelegateOwner,
        false
      )

      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      // mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(mockIndexer_getStakedAmount, 250)

      await reverted(
        delegate.setRuleAndIntent(MOCK_WETH, MOCK_DAI, rule, stakeAmount),
        'STAKING_RETURN_FAILED.'
      )
    })
  })

  describe('Test unsetRuleAndIntent()', async () => {
    it('Test calling unsetRuleAndIntent() with transfer error', async () => {
      const mockScore = 1000

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(
        mockIndexer_getStakedAmount,
        mockScore
      )

      //mock a failed transfer
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_transfer,
        false
      )

      await reverted(
        delegate.unsetRuleAndIntent(MOCK_WETH, MOCK_DAI),
        'STAKING_RETURN_FAILED'
      )
    })

    it('Test successfully calling unsetRuleAndIntent() with 0 staked amount', async () => {
      const mockScore = 0

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(
        mockIndexer_getStakedAmount,
        mockScore
      )

      await passes(delegate.unsetRuleAndIntent(MOCK_WETH, MOCK_DAI))
    })

    it('Test successfully calling unsetRuleAndIntent() with staked amount', async () => {
      const mockScore = 1000

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(
        mockIndexer_getStakedAmount,
        mockScore
      )

      //mock a successful transfer
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_transfer,
        true
      )

      await passes(delegate.unsetRuleAndIntent(MOCK_WETH, MOCK_DAI))
    })

    it('Test successfully calling unsetRuleAndIntent() with staked amount', async () => {
      const mockScore = 1000

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(
        mockIndexer_getStakedAmount,
        mockScore
      )

      //mock a successful transfer
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_transfer,
        true
      )

      await passes(delegate.unsetRuleAndIntent(MOCK_WETH, MOCK_DAI))
    })
  })

  describe('Test setTradeWallet', async () => {
    it('Test setTradeWallet when not owner', async () => {
      await reverted(delegate.setTradeWallet(notOwner, { from: notOwner }))
    })

    it('Test setTradeWallet when owner', async () => {
      await passes(delegate.setTradeWallet(notOwner, { from: owner }))
    })

    it('Test setTradeWallet with empty address', async () => {
      await reverted(
        delegate.setTradeWallet(ADDRESS_ZERO, { from: owner }),
        'TRADE_WALLET_REQUIRED'
      )
    })
  })

  describe('Test transfer of ownership', async () => {
    it('Test ownership after transfer', async () => {
      await delegate.transferOwnership(notOwner)
      const val = await delegate.owner.call()
      equal(val, notOwner, 'owner was not passed properly')
    })
  })

  describe('Test getSignerSideQuote', async () => {
    it('test when rule does not exist', async () => {
      const NON_EXISTENT_SIGNER_TOKEN = accounts[7]
      const val = await delegate.getSignerSideQuote.call(
        1234,
        SENDER_TOKEN,
        NON_EXISTENT_SIGNER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a delegate does not exist'
      )
    })

    it('test when delegate amount is greater than max delegate amount', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      const val = await delegate.getSignerSideQuote.call(
        MAX_SENDER_AMOUNT + 1,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if delegate amount is greater than delegate max amount'
      )
    })

    it('test when delegate amount is 0', async () => {
      await delegate.setRule(
        SIGNER_TOKEN,
        SENDER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      const val = await delegate.getSignerSideQuote.call(
        0,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if delegate amount is 0'
      )
    })

    it('test a successful call - getSignerSideQuote', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const val = await delegate.getSignerSideQuote.call(
        1234,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      const expectedValue = Math.ceil((1234 * PRICE_COEF) / 10 ** EXP)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getSenderSideQuote', async () => {
    it('test when rule does not exist', async () => {
      const val = await delegate.getSenderSideQuote.call(
        4312,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if a delegate does not exist'
      )
    })

    it('test when delegate amount is not within acceptable value bounds', async () => {
      await delegate.setRule(SENDER_TOKEN, SIGNER_TOKEN, 100, 1, 0)
      let val = await delegate.getSenderSideQuote.call(
        0,
        SIGNER_TOKEN,
        SENDER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned delegate amount is 0'
      )

      val = await delegate.getSenderSideQuote.call(
        MAX_SENDER_AMOUNT,
        SIGNER_TOKEN,
        SENDER_TOKEN
      )
      equal(
        val.toNumber(),
        0,
        'no quote should be available if returned greater than max delegate amount'
      )
    })

    it('test a successful call - getSenderSideQuote', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const val = await delegate.getSenderSideQuote.call(
        500,
        SIGNER_TOKEN,
        SENDER_TOKEN
      )
      const expectedValue = Math.floor((500 * 10 ** EXP) / PRICE_COEF)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getMaxQuote', async () => {
    it('test when rule does not exist', async () => {
      const val = await delegate.getMaxQuote.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        val[0].toNumber(),
        0,
        'no quote should be available if a delegate does not exist'
      )
      equal(
        val[1].toNumber(),
        0,
        'no quote should be available if a delegate does not exist'
      )
    })

    it('test a successful call - getMaxQuote', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )
      const val = await delegate.getMaxQuote.call(SENDER_TOKEN, SIGNER_TOKEN)

      equal(
        val[0].toNumber(),
        MAX_SENDER_AMOUNT,
        'get max quote returned incorrect sender quote'
      )

      const expectedValue = Math.ceil(
        (MAX_SENDER_AMOUNT * PRICE_COEF) / 10 ** EXP
      )
      equal(
        val[1].toNumber(),
        expectedValue,
        'get max quote returned incorrect signer quote'
      )
    })
  })

  describe('Test provideOrder', async () => {
    it('test if a rule does not exist', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: 555,
            token: SENDER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: 999,
            token: SIGNER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'TOKEN_PAIR_INACTIVE'
      )
    })

    it('test if an order exceeds maximum amount', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: 555,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: MAX_SENDER_AMOUNT + 1,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'AMOUNT_EXCEEDS_MAX'
      )
    })

    it('test if the sender is not empty and not the trade wallet', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const signerAmount = 100
      const senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: notTradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'SENDER_WALLET_INVALID'
      )
    })

    it('test if order is not priced according to the rule', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const order = await signOrder(
        createOrder({
          signer: {
            amount: 30,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: MAX_SENDER_AMOUNT,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      await reverted(
        delegate.provideOrder(order, {
          from: notOwner,
        })
      )
    })

    it('test if order sender and signer amount are not matching', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const signerAmount = 100
      const senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount - 100, //Fudge the price
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      await reverted(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'PRICE_INVALID'
      )
    })

    it('test if order signer kind is not an ERC20 interface id', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const signerAmount = 100
      const senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
            kind: '0x80ac58cd',
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      await reverted(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'SIGNER_KIND_MUST_BE_ERC20'
      )
    })

    it('test if order sender kind is not an ERC20 interface id', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const signerAmount = 100
      const senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
            kind: '0x80ac58cd',
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      await reverted(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'SENDER_KIND_MUST_BE_ERC20'
      )
    })

    it('test a successful transaction with integer values', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        100,
        EXP
      )

      const ruleBefore = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)

      const signerAmount = 100

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: 100,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      await passes(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(order, {
          from: notOwner,
        })
      )

      const ruleAfter = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - signerAmount,
        "rule's max sender amount was not decremented"
      )

      //check if swap() was called
      const invocationCount = await mockSwap.invocationCountForMethod.call(
        swapFunction
      )
      equal(
        invocationCount,
        1,
        'swap function was not called the expected number of times'
      )
    })

    it('test a successful transaction with trade wallet as sender', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        100,
        EXP
      )

      const ruleBefore = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)

      const signerAmount = 100

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: 100,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      //mock swapContract
      //test rule decrement
      const tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      emitted(tx, 'ProvideOrder')

      const ruleAfter = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - signerAmount,
        "rule's max delegate amount was not decremented"
      )

      //check if swap() was called
      const invocationCount = await mockSwap.invocationCountForMethod.call(
        swapFunction
      )
      equal(
        invocationCount,
        1,
        'swap function was not called the expected number of times'
      )
    })

    it('test a successful transaction with decimal values', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const ruleBefore = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)

      const signerAmount = 100
      const senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      const tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      emitted(tx, 'ProvideOrder')

      const ruleAfter = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - senderAmount,
        "rule's max delegate amount was not decremented"
      )
    })

    it('test a getting a signerSideQuote and passing it into provideOrder', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const senderAmount = 123
      const signerQuote = await delegate.getSignerSideQuote.call(
        senderAmount,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )

      const signerAmount = signerQuote.toNumber()

      // put that quote into an order
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      const tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      passes(tx)
    })

    it('test a getting a senderSideQuote and passing it into provideOrder', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const signerAmount = 8425
      const senderQuote = await delegate.getSenderSideQuote.call(
        signerAmount,
        SIGNER_TOKEN,
        SENDER_TOKEN
      )

      const senderAmount = senderQuote.toNumber()

      // put that quote into an order
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      const tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      passes(tx)
    })

    it('test a getting a getMaxQuote and passing it into provideOrder', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      const val = await delegate.getMaxQuote.call(SENDER_TOKEN, SIGNER_TOKEN)

      const senderAmount = val[0].toNumber()
      const signerAmount = val[1].toNumber()

      // put that quote into an order
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      const tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      passes(tx)
    })

    it('test the signer trying to trade just 1 unit over the rule price - fails', async () => {
      // 1 SenderToken for 0.005 SignerToken => 200 SenderToken for 1 SignerToken
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        5,
        3
      )

      const senderAmount = 201 // 1 unit more than the delegate wants to send
      const signerAmount = 1

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      // check the delegate doesnt allow this
      await reverted(
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'PRICE_INVALID'
      )
    })

    it('test the signer trying to trade just 1 unit less than the rule price - passes', async () => {
      // 1 SenderToken for 0.005 SignerToken => 200 SenderToken for 1 SignerToken
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        5,
        3
      )

      const senderAmount = 199 // 1 unit less than the delegate rule
      const signerAmount = 1

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      // check the delegate allows this
      const tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      passes(tx)
    })

    it('test the signer trying to trade the exact amount of rule price - passes', async () => {
      // 1 SenderToken for 0.005 SignerToken => 200 SenderToken for 1 SignerToken
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        5,
        3
      )

      const senderAmount = 200
      const signerAmount = 1

      const order = await signOrder(
        createOrder({
          signer: {
            wallet: notOwner,
            amount: signerAmount,
            token: SIGNER_TOKEN,
          },
          sender: {
            wallet: tradeWallet,
            amount: senderAmount,
            token: SENDER_TOKEN,
          },
        }),
        notOwnerSigner,
        swapAddress
      )

      // check the delegate allows this
      const tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      passes(tx)
    })
  })
})
