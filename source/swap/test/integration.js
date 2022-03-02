const { expect } = require('chai')
const {
  createOrder,
  orderToParams,
  createSwapSignature,
} = require('@airswap/utils')
const { ethers } = require('hardhat')
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')

describe('Swap Integration Tests', () => {
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
  const REBATE_SCALE = '10'
  const REBATE_MAX = '100'
  const PROTOCOL_FEE = '30'
  const PROTOCOL_FEE_LIGHT = '7'
  const DEFAULT_AMOUNT = '10000'

  async function createSignedOrder(params, signer) {
    const unsignedOrder = createOrder({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: sender.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return orderToParams({
      ...unsignedOrder,
      ...(await createSwapSignature(
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
    ;[sender, signer, protocolFeeWallet] = await ethers.getSigners()

    stakingToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('Staking', 'STAKE')
    await stakingToken.deployed()
    stakingToken.mint(sender.address, 10000000000)

    staking = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy(stakingToken.address, 'Staking', 'STAKING', 100, 100)
    await staking.deployed()

    signerToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('A', 'A')
    await signerToken.deployed()
    signerToken.mint(signer.address, 1000000)

    senderToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('B', 'B')
    await senderToken.deployed()
    senderToken.mint(sender.address, 1000000)

    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      REBATE_SCALE,
      REBATE_MAX,
      staking.address
    )
    await swap.deployed()

    signerToken.connect(signer).approve(swap.address, 1000000)
    senderToken.connect(sender).approve(swap.address, 1000000)
  })

  describe('Test rebates', async () => {
    it('test swap without rebate', async () => {
      // await stakingToken.mock.balanceOf.returns(0)

      const order = await createSignedOrder({}, signer)
      await expect(
        await swap.connect(sender).swap(sender.address, ...order)
      ).to.emit(swap, 'Swap')

      // Expect full 30 to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect full fee to have been sent to sender
      expect(await signerToken.balanceOf(sender.address)).to.equal('10000')

      // Expect no fee to have been sent to fee wallet
      expect(await signerToken.balanceOf(protocolFeeWallet.address)).to.equal(
        '30'
      )
    })

    it('test swap with rebate', async () => {
      await stakingToken.connect(sender).approve(staking.address, 10000000000)
      await staking.connect(sender).stake(10000000000)

      const order = await createSignedOrder({}, signer)

      await expect(
        await swap.connect(sender).swap(sender.address, ...order)
      ).to.emit(swap, 'Swap')

      // Expect full 30 to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect half of the fee to have gone to the sender as rebate
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
      await expect(await swap.connect(sender).light(...order)).to.emit(
        swap,
        'Swap'
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
