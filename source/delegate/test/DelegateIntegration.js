const { expect } = require('chai')
const {
  createOrderERC20,
  orderERC20ToParams,
  createOrderERC20Signature,
} = require('@airswap/utils')
const { ethers } = require('hardhat')
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const SWAP_ERC20 = require('@airswap/swap-erc20/build/contracts/SwapERC20.sol/SwapERC20.json')

describe('Delegate Integration', () => {
  let snapshotId
  let takerToken
  let delegatorToken

  let deployer
  let delegator
  let taker

  const CHAIN_ID = 31337
  const BONUS_SCALE = '10'
  const BONUS_MAX = '100'
  const PROTOCOL_FEE = '30'
  const PROTOCOL_FEE_LIGHT = '7'
  const DEFAULT_AMOUNT = '10000'
  const DEFAULT_BALANCE = '1000000'

  async function createSignedOrderERC20(params, taker) {
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
        taker,
        swapERC20.address,
        CHAIN_ID
      )),
    })
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('get signers and deploy', async () => {
    ;[deployer, delegator, taker, protocolFeeWallet] = await ethers.getSigners()

    swapERC20 = await (
      await ethers.getContractFactory(SWAP_ERC20.abi, SWAP_ERC20.bytecode)
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      deployer.address,
      BONUS_SCALE,
      BONUS_MAX
    )
    await swapERC20.deployed()

    delegate = await (
      await ethers.getContractFactory('Delegate')
    ).deploy(swapERC20.address)
    await delegate.deployed()

    takerToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('A', 'A')
    await takerToken.deployed()
    await takerToken.mint(taker.address, DEFAULT_BALANCE)

    delegatorToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('B', 'B')
    await delegatorToken.deployed()
    await delegatorToken.mint(delegator.address, DEFAULT_BALANCE)

    takerToken.connect(taker).approve(swapERC20.address, DEFAULT_BALANCE)
    delegatorToken
      .connect(delegator)
      .approve(swapERC20.address, DEFAULT_BALANCE)
  })

  describe('Test transfers', async () => {
    it('test a delegated swap', async () => {
      await delegate
        .connect(delegator)
        .setRule(
          delegatorToken.address,
          DEFAULT_AMOUNT,
          takerToken.address,
          DEFAULT_AMOUNT
        )

      delegatorToken
        .connect(delegator)
        .approve(delegate.address, DEFAULT_AMOUNT)

      takerToken
        .connect(taker)
        .approve(swapERC20.address, DEFAULT_AMOUNT + PROTOCOL_FEE)

      const order = await createSignedOrderERC20({}, taker)

      await expect(
        delegate.connect(taker).swap(delegator.address, ...order)
      ).to.emit(delegate, 'DelegateSwap')

      expect(await takerToken.balanceOf(delegator.address)).to.equal(
        DEFAULT_AMOUNT
      )

      expect(await takerToken.balanceOf(taker.address)).to.equal(
        DEFAULT_BALANCE - DEFAULT_AMOUNT - PROTOCOL_FEE
      )

      expect(await delegatorToken.balanceOf(taker.address)).to.equal(
        DEFAULT_AMOUNT
      )

      expect(await delegatorToken.balanceOf(delegator.address)).to.equal(
        DEFAULT_BALANCE - DEFAULT_AMOUNT
      )

      expect(await delegatorToken.balanceOf(delegate.address)).to.equal(0)
      expect(await takerToken.balanceOf(delegate.address)).to.equal(0)
    })
  })
})
