const { expect } = require('chai')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')

describe('Light Integration Tests', () => {
  let snapshotId
  let light
  let signerToken
  let senderToken

  let deployer
  let sender
  let signer
  let feeWallet

  const CHAIN_ID = 31337
  const SIGNER_FEE = '7'
  const CONDITIONAL_SIGNER_FEE = '30'
  const STAKING_REBATE_MINIMUM = '1000000'
  const DEFAULT_AMOUNT = '10000'

  async function createSignedOrder(params, signer) {
    const unsignedOrder = createLightOrder({
      signerFee: SIGNER_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: sender.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return lightOrderToParams({
      ...unsignedOrder,
      ...(await createLightSignature(
        unsignedOrder,
        signer,
        light.address,
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
    ;[deployer, sender, signer, feeWallet] = await ethers.getSigners()

    stakingToken = await deployMockContract(deployer, ERC20.abi)

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

    light = await (
      await ethers.getContractFactory('Light')
    ).deploy(
      feeWallet.address,
      SIGNER_FEE,
      CONDITIONAL_SIGNER_FEE,
      STAKING_REBATE_MINIMUM,
      stakingToken.address
    )
    await light.deployed()

    signerToken.connect(signer).approve(light.address, 1000000)
    senderToken.connect(sender).approve(light.address, 1000000)
  })

  describe('Test rebates', async () => {
    it('test swap without rebate', async () => {
      await stakingToken.mock.balanceOf.returns(0)

      const order = await createSignedOrder({}, signer)
      await expect(
        await light.connect(sender).swapWithConditionalFee(...order)
      ).to.emit(light, 'Swap')

      // Expect full 30 to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect full fee to have been sent to sender
      expect(await signerToken.balanceOf(sender.address)).to.equal('10000')

      // Expect no fee to have been sent to fee wallet
      expect(await signerToken.balanceOf(feeWallet.address)).to.equal(
        CONDITIONAL_SIGNER_FEE
      )
    })

    it('test swap with rebate', async () => {
      await stakingToken.mock.balanceOf.returns(10000000000)

      const order = await createSignedOrder({}, signer)
      await expect(
        await light.connect(sender).swapWithConditionalFee(...order)
      ).to.emit(light, 'Swap')

      // Expect full 30 to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect full fee to have been sent to sender
      expect(await signerToken.balanceOf(sender.address)).to.equal('10030')

      // Expect no fee to have been sent to fee wallet
      expect(await signerToken.balanceOf(feeWallet.address)).to.equal('0')
    })
  })
})
