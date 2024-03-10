const { expect } = require('chai')
const { toAtomicString } = require('@airswap/utils')

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
  let signer
  let sender
  let alice
  let bob
  let swapERC20
  let signerToken
  let senderToken

  let delegate
  let snapshotId

  async function createSignedOrderERC20(params, signatory) {
    const unsignedOrder = createOrderERC20({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: sender.address,
      senderToken: senderToken.address,
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

  async function createSignedPublicOrderERC20(params, signatory) {
    const unsignedOrder = createOrderERC20({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: ADDRESS_ZERO,
      senderToken: senderToken.address,
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
    signerWallet,
    signerAmount,
    senderWallet,
    senderAmount,
    delegator
  ) {
    await signerToken.mock.allowance
      .withArgs(signerWallet, swapERC20.address)
      .returns(signerAmount)
    await senderToken.mock.allowance
      .withArgs(senderWallet, swapERC20.address)
      .returns(senderAmount)
    await senderToken.mock.allowance
      .withArgs(delegator, delegate.address)
      .returns(senderAmount)
  }

  async function setUpBalances(signerWallet, senderWallet) {
    await senderToken.mock.balanceOf
      .withArgs(senderWallet)
      .returns(DEFAULT_BALANCE)
    await signerToken.mock.balanceOf
      .withArgs(signerWallet)
      .returns(DEFAULT_BALANCE)
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, alice, bob, carol, signer, sender] = await ethers.getSigners()

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

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)
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
          .connect(alice)
          .setRule(
            signerToken.address,
            DEFAULT_AMOUNT,
            senderToken.address,
            DEFAULT_AMOUNT
          )
      )
        .to.emit(delegate, 'SetRule')
        .withArgs(
          alice.address,
          signerToken.address,
          DEFAULT_AMOUNT,
          senderToken.address,
          DEFAULT_AMOUNT
        )
    })

    it('unsets a Rule', async () => {
      await expect(delegate.connect(alice).unsetRule(signerToken.address))
        .to.emit(delegate, 'UnsetRule')
        .withArgs(alice.address, signerToken.address)
    })
  })

  describe('Swap', async () => {
    it('successfully swaps', async () => {
      await delegate
        .connect(alice)
        .setRule(
          signerToken.address,
          DEFAULT_AMOUNT,
          senderToken.address,
          DEFAULT_AMOUNT
        )

      const order = await createSignedOrderERC20(
        {
          signerWallet: bob.address,
          senderWallet: delegate.address,
        },
        bob
      )

      setUpAllowances(
        bob.address,
        DEFAULT_AMOUNT + PROTOCOL_FEE,
        delegate.address,
        DEFAULT_AMOUNT,
        alice.address
      )
      await setUpBalances(bob.address, alice.address)

      await senderToken.mock.approve
        .withArgs(swapERC20.address, DEFAULT_AMOUNT)
        .returns(true)

      await expect(delegate.connect(bob).swap(alice.address, ...order)).to.emit(
        delegate,
        'DelegateSwap'
      )
    })
  })
})
