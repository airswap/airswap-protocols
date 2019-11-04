const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('Swap')
const Indexer = artifacts.require('Indexer')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')
const {
  equal,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

const { orders } = require('@airswap/order-utils')

contract('Delegate Unit Tests', async accounts => {
  const owner = accounts[0]
  const tradeWallet = accounts[1]
  const notOwner = accounts[2]
  const notTradeWallet = accounts[3]
  const SIGNER_TOKEN = accounts[4]
  const SENDER_TOKEN = accounts[5]
  const MOCK_WETH = accounts[6]
  const MOCK_DAI = accounts[7]
  const MAX_SENDER_AMOUNT = 12345
  const PRICE_COEF = 4321
  const EXP = 2

  let delegate
  let mockSwap
  let snapshotId
  let swapFunction
  let mockStakingToken
  let mockStakingToken_allowance
  let mockStakingToken_transferFrom
  let mockStakingToken_transfer
  let mockStakingToken_approve
  let mockIndexer
  let mockIndexer_getStakedAmount

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  async function setupMockTokens() {
    mockStakingToken = await MockContract.new()
    let mockFungibleTokenTemplate = await FungibleToken.new()

    mockStakingToken_allowance = await mockFungibleTokenTemplate.contract.methods
      .allowance(EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()

    mockStakingToken_transferFrom = await mockFungibleTokenTemplate.contract.methods
      .transferFrom(EMPTY_ADDRESS, EMPTY_ADDRESS, 0)
      .encodeABI()

    mockStakingToken_transfer = await mockFungibleTokenTemplate.contract.methods
      .transfer(EMPTY_ADDRESS, 0)
      .encodeABI()

    mockStakingToken_approve = await mockFungibleTokenTemplate.contract.methods
      .approve(EMPTY_ADDRESS, 0)
      .encodeABI()
  }

  async function setupMockSwap() {
    let swapTemplate = await Swap.new()
    const order = await orders.getOrder({})
    swapFunction = swapTemplate.contract.methods.swap(order).encodeABI()

    mockSwap = await MockContract.new()
  }

  async function setupMockIndexer() {
    mockIndexer = await MockContract.new()
    let mockIndexerTemplate = await Indexer.new(EMPTY_ADDRESS)

    //mock setIntent()
    let mockIndexer_setIntent = mockIndexerTemplate.contract.methods
      .setIntent(EMPTY_ADDRESS, EMPTY_ADDRESS, 0, web3.utils.fromAscii(''))
      .encodeABI()
    await mockIndexer.givenMethodReturnBool(mockIndexer_setIntent, true)

    //mock unsetIntent()
    let mockIndexer_unsetIntent = mockIndexerTemplate.contract.methods
      .unsetIntent(EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
    await mockIndexer.givenMethodReturnBool(mockIndexer_unsetIntent, true)

    //mock stakingToken()
    let mockIndexer_stakingToken = mockIndexerTemplate.contract.methods
      .stakingToken()
      .encodeABI()
    await mockIndexer.givenMethodReturnAddress(
      mockIndexer_stakingToken,
      mockStakingToken.address
    )

    //mock getStakedAmount()
    mockIndexer_getStakedAmount = mockIndexerTemplate.contract.methods
      .getStakedAmount(EMPTY_ADDRESS, EMPTY_ADDRESS, EMPTY_ADDRESS)
      .encodeABI()
  }

  before('deploy Delegate', async () => {
    await setupMockTokens()
    await setupMockSwap()
    await setupMockIndexer()

    await mockStakingToken.givenMethodReturnBool(mockStakingToken_approve, true)

    delegate = await Delegate.new(
      mockSwap.address,
      mockIndexer.address,
      EMPTY_ADDRESS,
      tradeWallet,
      {
        from: owner,
      }
    )
  })

  describe('Test constructor', async () => {
    it('Test initial Swap Contract', async () => {
      let val = await delegate.swapContract.call()
      equal(val, mockSwap.address, 'swap address is incorrect')
    })

    it('Test initial trade wallet value', async () => {
      let val = await delegate.tradeWallet.call()
      equal(val, tradeWallet, 'trade wallet is incorrect')
    })

    it('Test constructor sets the owner as the trade wallet on empty address', async () => {
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      let newDelegate = await Delegate.new(
        mockSwap.address,
        mockIndexer.address,
        EMPTY_ADDRESS,
        EMPTY_ADDRESS,
        {
          from: owner,
        }
      )

      let val = await newDelegate.tradeWallet.call()
      equal(val, owner, 'trade wallet is incorrect')
    })

    it('Test owner is set correctly having been provided an empty address', async () => {
      let val = await delegate.owner.call()
      equal(val, owner, 'owner is incorrect - should be owner')
    })

    it('Test owner is set correctly if provided an address', async () => {
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      let newDelegate = await Delegate.new(
        mockSwap.address,
        mockIndexer.address,
        notOwner,
        tradeWallet,
        {
          from: owner,
        }
      )

      // being provided an empty address, it should leave the owner unchanged
      let val = await newDelegate.owner.call()
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
          mockSwap.address,
          mockIndexer.address,
          EMPTY_ADDRESS,
          EMPTY_ADDRESS,
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
      let trx = await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      //check if rule has been added
      let rule = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
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
      let ruleBefore = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleBefore[0].toNumber(),
        MAX_SENDER_AMOUNT,
        'max delegate amount is incorrectly saved'
      )

      trx = await delegate.unsetRule(SENDER_TOKEN, SIGNER_TOKEN)

      //check that the rule has been removed
      let ruleAfter = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
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
      let stakeAmount = 250

      let rule = [100000, 300, 0]

      await mockStakingToken.givenMethodReturnUint(
        mockStakingToken_allowance,
        stakeAmount
      )
      //mock unsuccessful transfer
      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_transferFrom,
        false
      )

      await reverted(
        delegate.setRuleAndIntent(MOCK_WETH, MOCK_DAI, rule, stakeAmount),
        'STAKING_TRANSFER_FAILED'
      )
    })

    it('Test successfully calling setRuleAndIntent with 0 staked amount', async () => {
      let stakeAmount = 0

      let rule = [100000, 300, 0]

      await mockStakingToken.givenMethodReturnBool(
        mockStakingToken_approve,
        true
      )

      await passes(
        delegate.setRuleAndIntent(MOCK_WETH, MOCK_DAI, rule, stakeAmount)
      )
    })

    it('Test successfully calling setRuleAndIntent with staked amount', async () => {
      let stakeAmount = 250

      let rule = [100000, 300, 0]

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

      await passes(
        delegate.setRuleAndIntent(MOCK_WETH, MOCK_DAI, rule, stakeAmount)
      )
    })
  })

  describe('Test unsetRuleAndIntent()', async () => {
    it('Test calling unsetRuleAndIntent() with transfer error', async () => {
      let mockScore = 1000

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
        'STAKING_TRANSFER_FAILED'
      )
    })

    it('Test successfully calling unsetRuleAndIntent() with 0 staked amount', async () => {
      let mockScore = 0

      //mock the score/staked amount to be transferred
      await mockIndexer.givenMethodReturnUint(
        mockIndexer_getStakedAmount,
        mockScore
      )

      await passes(delegate.unsetRuleAndIntent(MOCK_WETH, MOCK_DAI))
    })

    it('Test successfully calling unsetRuleAndIntent() with staked amount', async () => {
      let mockScore = 1000

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
        delegate.setTradeWallet(EMPTY_ADDRESS, { from: owner }),
        'TRADE_WALLET_REQUIRED'
      )
    })
  })

  describe('Test transfer of ownership', async () => {
    it('Test ownership after transfer', async () => {
      await delegate.transferOwnership(notOwner)
      let val = await delegate.owner.call()
      equal(val, notOwner, 'owner was not passed properly')
    })
  })

  describe('Test getSignerSideQuote', async () => {
    it('test when rule does not exist', async () => {
      const NON_EXISTENT_SIGNER_TOKEN = accounts[7]
      let val = await delegate.getSignerSideQuote.call(
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
      let val = await delegate.getSignerSideQuote.call(
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
      let val = await delegate.getSignerSideQuote.call(
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

      let val = await delegate.getSignerSideQuote.call(
        1234,
        SENDER_TOKEN,
        SIGNER_TOKEN
      )
      let expectedValue = Math.floor((1234 * PRICE_COEF) / 10 ** EXP)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getSenderSideQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await delegate.getSenderSideQuote.call(
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

      let val = await delegate.getSenderSideQuote.call(
        500,
        SIGNER_TOKEN,
        SENDER_TOKEN
      )
      let expectedValue = Math.floor((500 * 10 ** EXP) / PRICE_COEF)
      equal(val.toNumber(), expectedValue, 'there should be a quote available')
    })
  })

  describe('Test getMaxQuote', async () => {
    it('test when rule does not exist', async () => {
      let val = await delegate.getMaxQuote.call(SENDER_TOKEN, SIGNER_TOKEN)
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
      let val = await delegate.getMaxQuote.call(SENDER_TOKEN, SIGNER_TOKEN)

      equal(
        val[0].toNumber(),
        MAX_SENDER_AMOUNT,
        'no quote should be available if a peer does not exist'
      )

      let expectedValue = Math.floor(
        (MAX_SENDER_AMOUNT * PRICE_COEF) / 10 ** EXP
      )
      equal(
        val[1].toNumber(),
        expectedValue,
        'no quote should be available if a delegate does not exist'
      )
    })
  })

  describe('Test provideOrder', async () => {
    it('test if a rule does not exist', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: 555,
          token: SENDER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: 999,
          token: SIGNER_TOKEN,
        },
      })

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

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: 555,
          token: SIGNER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: MAX_SENDER_AMOUNT + 1,
          token: SENDER_TOKEN,
        },
      })

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

      let signerAmount = 100
      let senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SIGNER_TOKEN,
        },
        sender: {
          wallet: notTradeWallet,
          param: senderAmount,
          token: SENDER_TOKEN,
        },
      })

      await reverted(
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'INVALID_SENDER_WALLET'
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

      const order = await orders.getOrder({
        signer: {
          param: 30,
          token: SIGNER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: MAX_SENDER_AMOUNT,
          token: SENDER_TOKEN,
        },
      })

      await reverted(
        delegate.provideOrder(order, {
          from: notOwner,
        })
      )
    })

    it('test if order sender and signer param are not matching', async () => {
      await delegate.setRule(
        SENDER_TOKEN,
        SIGNER_TOKEN,
        MAX_SENDER_AMOUNT,
        PRICE_COEF,
        EXP
      )

      let signerAmount = 100
      let senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount - 100, //Fudge the price
          token: SIGNER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: senderAmount,
          token: SENDER_TOKEN,
        },
      })

      await reverted(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(order, {
          from: notOwner,
        }),
        'PRICE_INCORRECT'
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

      let signerAmount = 100
      let senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SIGNER_TOKEN,
          kind: '0x80ac58cd',
        },
        sender: {
          wallet: tradeWallet,
          param: senderAmount,
          token: SENDER_TOKEN,
        },
      })

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

      let signerAmount = 100
      let senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SIGNER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: senderAmount,
          token: SENDER_TOKEN,
          kind: '0x80ac58cd',
        },
      })

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

      let ruleBefore = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)

      let signerAmount = 100

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SIGNER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: 100,
          token: SENDER_TOKEN,
        },
      })

      await passes(
        //mock swapContract
        //test rule decrement
        delegate.provideOrder(order, {
          from: notOwner,
        })
      )

      let ruleAfter = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - signerAmount,
        "rule's max peer amount was not decremented"
      )

      //check if swap() was called
      let invocationCount = await mockSwap.invocationCountForMethod.call(
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

      let ruleBefore = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)

      let signerAmount = 100

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SIGNER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: 100,
          token: SENDER_TOKEN,
        },
      })

      //mock swapContract
      //test rule decrement
      let tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      emitted(tx, 'ProvideOrder')

      let ruleAfter = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - signerAmount,
        "rule's max delegate amount was not decremented"
      )

      //check if swap() was called
      let invocationCount = await mockSwap.invocationCountForMethod.call(
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

      let ruleBefore = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)

      let signerAmount = 100
      let senderAmount = Math.floor((signerAmount * 10 ** EXP) / PRICE_COEF)

      const order = await orders.getOrder({
        signer: {
          wallet: notOwner,
          param: signerAmount,
          token: SIGNER_TOKEN,
        },
        sender: {
          wallet: tradeWallet,
          param: senderAmount,
          token: SENDER_TOKEN,
        },
      })

      let tx = await delegate.provideOrder(order, {
        from: notOwner,
      })

      emitted(tx, 'ProvideOrder')

      let ruleAfter = await delegate.rules.call(SENDER_TOKEN, SIGNER_TOKEN)
      equal(
        ruleAfter[0].toNumber(),
        ruleBefore[0].toNumber() - senderAmount,
        "rule's max delegate amount was not decremented"
      )
    })
  })
})
