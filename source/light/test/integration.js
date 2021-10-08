const { expect } = require('chai')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')

describe('Light Unit Tests', () => {
  let snapshotId
  let light
  let signerToken
  let senderToken

  let deployer
  let sender
  let signer
  let feeWallet

  const CHAIN_ID = 31337
  const SIGNER_FEE = '30'
  const REBATE_SCALE = '10'
  const REBATE_MAX = '100'
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
    await stakingToken.mock.balanceOf.returns(10000000000)

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
      REBATE_SCALE,
      REBATE_MAX,
      stakingToken.address
    )
    await light.deployed()

    signerToken.connect(signer).approve(light.address, 1000000)
    senderToken.connect(sender).approve(light.address, 1000000)
  })

  describe('Test rebates', async () => {
    it('test swap', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(
        await light.connect(sender).swapWithRebate(...order)
      ).to.emit(light, 'Swap')

      // Expect full 30 to be taken from signer
      expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect half of 30 to be given to sender
      expect(await signerToken.balanceOf(sender.address)).to.equal('10015')

      // Expect other half of 30 to be given to fee wallet
      expect(await signerToken.balanceOf(feeWallet.address)).to.equal('15')
    })
  })
})
