const { expect } = require('chai')
const {
  createOrderERC20,
  orderERC20ToParams,
  createOrderERC20Signature,
  SECONDS_IN_DAY,
} = require('@airswap/utils')
const { ethers } = require('hardhat')
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const SWAP_ERC20 = require('@airswap/swap-erc20/build/contracts/SwapERC20.sol/SwapERC20.json')

describe('Delegate Integration', () => {
  let snapshotId
  let signerToken
  let senderToken

  let deployer
  let sender
  let signer

  const CHAIN_ID = 31337
  const BONUS_SCALE = '10'
  const BONUS_MAX = '100'
  const PROTOCOL_FEE = '5'
  const DEFAULT_SENDER_AMOUNT = '10000'
  const DEFAULT_SIGNER_AMOUNT = '10000'
  const DEFAULT_BALANCE = '1000000'
  const RULE_EXPIRY =
    Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString() + 1

  async function createSignedOrderERC20(params, signer) {
    const unsignedOrder = createOrderERC20({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_SIGNER_AMOUNT,
      senderWallet: delegate.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_SENDER_AMOUNT,
      ...params,
    })
    return orderERC20ToParams({
      ...unsignedOrder,
      ...(await createOrderERC20Signature(
        unsignedOrder,
        signer,
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
    ;[deployer, sender, signer, protocolFeeWallet] = await ethers.getSigners()

    swapERC20 = await (
      await ethers.getContractFactory(SWAP_ERC20.abi, SWAP_ERC20.bytecode)
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE,
      deployer.address,
      BONUS_SCALE,
      BONUS_MAX
    )
    await swapERC20.deployed()

    delegate = await (
      await ethers.getContractFactory('Delegate')
    ).deploy(swapERC20.address)
    await delegate.deployed()

    signerToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('A', 'A')
    await signerToken.deployed()
    await signerToken.mint(signer.address, DEFAULT_BALANCE)

    senderToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('B', 'B')
    await senderToken.deployed()
    await senderToken.mint(sender.address, DEFAULT_BALANCE)

    signerToken.connect(signer).approve(swapERC20.address, DEFAULT_BALANCE)
    senderToken.connect(sender).approve(delegate.address, DEFAULT_BALANCE)
  })

  describe('Test transfers', async () => {
    it('test a delegated swap', async () => {
      await delegate
        .connect(sender)
        .setRule(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      signerToken
        .connect(signer)
        .approve(swapERC20.address, DEFAULT_SIGNER_AMOUNT + PROTOCOL_FEE)

      const order = await createSignedOrderERC20({}, signer)

      await expect(
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.emit(delegate, 'DelegatedSwapFor')

      expect(await signerToken.balanceOf(sender.address)).to.equal(
        DEFAULT_SIGNER_AMOUNT
      )

      expect(await signerToken.balanceOf(signer.address)).to.equal(
        DEFAULT_BALANCE - DEFAULT_SIGNER_AMOUNT - PROTOCOL_FEE
      )

      expect(await senderToken.balanceOf(signer.address)).to.equal(
        DEFAULT_SENDER_AMOUNT
      )

      expect(await senderToken.balanceOf(sender.address)).to.equal(
        DEFAULT_BALANCE - DEFAULT_SENDER_AMOUNT
      )

      expect(await senderToken.balanceOf(delegate.address)).to.equal(0)
      expect(await signerToken.balanceOf(delegate.address)).to.equal(0)
    })
  })
})
