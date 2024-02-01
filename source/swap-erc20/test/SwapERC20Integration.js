const { expect } = require('chai')
const {
  createOrderERC20,
  orderERC20ToParams,
  createOrderERC20Signature,
} = require('@airswap/utils')
const { ethers } = require('hardhat')
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')

describe('SwapERC20 Integration', () => {
  let snapshotId
  let swap
  let signerToken
  let senderToken
  let staking

  let deployer
  let sender
  let signer
  let protocolFeeWallet

  const CHAIN_ID = 31337
  const BONUS_SCALE = '10'
  const BONUS_MAX = '100'
  const PROTOCOL_FEE = '30'
  const PROTOCOL_FEE_LIGHT = '7'
  const DEFAULT_AMOUNT = '10000'

  async function createSignedOrder(params, signer) {
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
        signer,
        swap.address,
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

    stakingToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('Staking', 'STAKE')
    await stakingToken.deployed()
    await stakingToken.mint(sender.address, 10000000000)

    staking = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy('Staking', 'STAKING', stakingToken.address, 100, 100)
    await staking.deployed()

    signerToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('A', 'A')
    await signerToken.deployed()
    await signerToken.mint(signer.address, 1000000)

    senderToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('B', 'B')
    await senderToken.deployed()
    await senderToken.mint(sender.address, 1000000)

    swap = await (
      await ethers.getContractFactory('SwapERC20')
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      BONUS_SCALE,
      BONUS_MAX
    )
    await swap.deployed()

    signerToken.connect(signer).approve(swap.address, 1000000)
    senderToken.connect(sender).approve(swap.address, 1000000)
  })

  describe('Test token holder bonuss', async () => {
    it('test swap without staking', async () => {
      const order = await createSignedOrder({}, signer)

      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
        'SwapERC20'
      )

      // Expect full 30 to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect full amount to have been sent to sender
      expect(await signerToken.balanceOf(sender.address)).to.equal('10000')

      // Expect full fee to have been sent to fee wallet
      expect(await signerToken.balanceOf(protocolFeeWallet.address)).to.equal(
        '30'
      )
    })

    it('test swap without bonus', async () => {
      const order = await createSignedOrder({}, signer)

      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
        'SwapERC20'
      )

      // Expect full fee to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect full amount to have been sent to sender
      expect(await signerToken.balanceOf(sender.address)).to.equal('10000')

      // Expect full fee to have been sent to fee wallet
      expect(await signerToken.balanceOf(protocolFeeWallet.address)).to.equal(
        '30'
      )
    })

    it('test swap with bonus', async () => {
      await stakingToken.connect(sender).approve(staking.address, 10000000000)
      await staking.connect(sender).stake(10000000000)

      await expect(swap.connect(deployer).setStaking(staking.address)).to.emit(
        swap,
        'SetStaking'
      )

      const order = await createSignedOrder({}, signer)

      await expect(
        await swap.connect(sender).swap(sender.address, ...order)
      ).to.emit(swap, 'SwapERC20')

      // Expect full 30 to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect half of the fee to have gone to the sender as bonus
      expect(await signerToken.balanceOf(sender.address)).to.equal('10015')

      // Expect half of the fee to have gone to the fee wallet
      expect(await signerToken.balanceOf(protocolFeeWallet.address)).to.equal(
        '15'
      )
    })

    it('test light swap', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
        },
        signer
      )
      await expect(await swap.connect(sender).swapLight(...order)).to.emit(
        swap,
        'SwapERC20'
      )

      // Expect full 7 to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989993')

      // Expect no fee to have gone to the sender
      expect(await signerToken.balanceOf(sender.address)).to.equal('10000')

      // Expect full fee to have gone to the fee wallet
      expect(await signerToken.balanceOf(protocolFeeWallet.address)).to.equal(
        '7'
      )
    })
  })
})
