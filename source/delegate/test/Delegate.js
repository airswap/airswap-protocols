const { expect } = require('chai')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const SWAP_ERC20 = require('@airswap/swap-erc20/build/contracts/SwapERC20.sol/SwapERC20.json')
const {
  createOrderERC20,
  orderERC20ToParams,
  createOrderERC20Signature,
} = require('@airswap/utils')
const { ADDRESS_ZERO } = require('@airswap/constants')
const CHAIN_ID = 31337
const DEFAULT_BALANCE = '100000'
const DEFAULT_AMOUNT = '10000'
const PROTOCOL_FEE = '30'
const PROTOCOL_FEE_LIGHT = '7'
const REBATE_SCALE = '10'
const REBATE_MAX = '100'

describe('Delegate Unit', () => {
  let deployer
  let delegator
  let taker
  let anyone
  let swapERC20
  let delegatorToken
  let takerToken
  let delegate
  let snapshotId

  async function createSignedOrderERC20(params, signatory) {
    const unsignedOrder = createOrderERC20({
      protocolFee: PROTOCOL_FEE,
      signerWallet: taker.address,
      signerToken: takerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: delegate.address,
      senderToken: delegatorToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return orderERC20ToParams({
      ...unsignedOrder,
      ...(await createOrderERC20Signature(
        unsignedOrder,
        signatory,
        swapERC20.address,
        CHAIN_ID
      )),
    })
  }

  async function setUpAllowances(
    delegatorWallet,
    delegatorAmount,
    takerWallet,
    takerAmount
  ) {
    await delegatorToken.mock.allowance
      .withArgs(delegatorWallet, delegate.address)
      .returns(delegatorAmount)
    await takerToken.mock.allowance
      .withArgs(takerWallet, swapERC20.address)
      .returns(takerAmount)
  }

  async function setUpBalances(delegatorWallet, takerWallet) {
    await delegatorToken.mock.balanceOf
      .withArgs(delegatorWallet)
      .returns(DEFAULT_BALANCE)
    await takerToken.mock.balanceOf
      .withArgs(takerWallet)
      .returns(DEFAULT_BALANCE)
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, delegator, taker, anyone] = await ethers.getSigners()

    const swapERC20Factory = await ethers.getContractFactory(
      SWAP_ERC20.abi,
      SWAP_ERC20.bytecode
    )
    swapERC20 = await swapERC20Factory.deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      deployer.address,
      REBATE_SCALE,
      REBATE_MAX
    )

    delegate = await (
      await ethers.getContractFactory('Delegate')
    ).deploy(swapERC20.address)
    await delegate.deployed()

    delegatorToken = await deployMockContract(deployer, IERC20.abi)
    takerToken = await deployMockContract(deployer, IERC20.abi)
    await delegatorToken.mock.transferFrom.returns(true)
    await takerToken.mock.transferFrom.returns(true)
  })

  describe('Constructor', async () => {
    it('swap ERC20 address is set', async () => {
      expect(await delegate.swapERC20()).to.equal(swapERC20.address)
    })
  })

  describe('Rules', async () => {
    it('sets a Rule', async () => {
      await expect(
        delegate
          .connect(delegator)
          .setRule(
            delegatorToken.address,
            DEFAULT_AMOUNT,
            takerToken.address,
            DEFAULT_AMOUNT
          )
      )
        .to.emit(delegate, 'SetRule')
        .withArgs(
          delegator.address,
          delegatorToken.address,
          DEFAULT_AMOUNT,
          takerToken.address,
          DEFAULT_AMOUNT
        )
    })

    it('unsets a Rule', async () => {
      await expect(
        delegate
          .connect(delegator)
          .unsetRule(delegatorToken.address, takerToken.address)
      )
        .to.emit(delegate, 'UnsetRule')
        .withArgs(delegator.address, delegatorToken.address, takerToken.address)
    })
  })

  describe('Swap', async () => {
    it('successfully swaps', async () => {
      await delegate
        .connect(delegator)
        .setRule(
          delegatorToken.address,
          DEFAULT_AMOUNT,
          takerToken.address,
          DEFAULT_AMOUNT
        )

      const order = await createSignedOrderERC20({}, taker)

      await setUpAllowances(
        delegator.address,
        DEFAULT_AMOUNT,
        taker.address,
        DEFAULT_AMOUNT + PROTOCOL_FEE
      )
      await setUpBalances(taker.address, delegator.address)

      await delegatorToken.mock.approve
        .withArgs(swapERC20.address, DEFAULT_AMOUNT)
        .returns(true)

      await takerToken.mock.approve
        .withArgs(swapERC20.address, DEFAULT_AMOUNT)
        .returns(true)

      await takerToken.mock.balanceOf
        .withArgs(delegate.address)
        .returns(DEFAULT_AMOUNT)

      await expect(
        delegate.connect(taker).swap(delegator.address, ...order)
      ).to.emit(delegate, 'DelegateSwap')
    })

    it('fails to swap with no rule', async () => {
      const order = await createSignedOrderERC20(
        {
          signerWallet: taker.address,
          senderWallet: delegate.address,
        },
        taker
      )

      await setUpAllowances(
        taker.address,
        DEFAULT_AMOUNT + PROTOCOL_FEE,
        delegator.address,
        DEFAULT_AMOUNT
      )
      await setUpBalances(taker.address, delegator.address)

      await delegatorToken.mock.approve
        .withArgs(swapERC20.address, DEFAULT_AMOUNT)
        .returns(true)

      await takerToken.mock.approve
        .withArgs(swapERC20.address, DEFAULT_AMOUNT)
        .returns(true)

      await takerToken.mock.balanceOf
        .withArgs(delegate.address)
        .returns(DEFAULT_AMOUNT)

      await expect(delegate.connect(taker).swap(delegator.address, ...order)).to
        .be.reverted
    })
  })
})
