const { expect } = require('chai')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle

const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const IWETH = require('../build/contracts/interfaces/IWETH.sol/IWETH.json')
const LIGHT = require('@airswap/light/build/contracts/Light.sol/Light.json')

describe('Wrapper Integration Tests', () => {
  let snapshotId
  let light
  let wrapper

  let weth
  let signerToken
  let senderToken

  let deployer
  let sender
  let signer
  let feeWallet

  const CHAIN_ID = 31337
  const SIGNER_FEE = '30'
  const DEFAULT_AMOUNT = '100'

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

    signerToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('A', 'A')
    await signerToken.deployed()
    signerToken.mint(signer.address, 10000)

    senderToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('B', 'B')
    await senderToken.deployed()
    senderToken.mint(sender.address, 10000)

    weth = await deployMockContract(deployer, IWETH.abi)
    await weth.mock.deposit.returns()
    await weth.mock.withdraw.returns()
    await weth.mock.transferFrom.returns(true)

    light = await (
      await ethers.getContractFactory(LIGHT.abi, LIGHT.bytecode)
    ).deploy(feeWallet.address, SIGNER_FEE)
    await light.deployed()

    signerToken.connect(signer).approve(light.address, 10000)
    senderToken.connect(sender).approve(light.address, 10000)

    wrapper = await (
      await ethers.getContractFactory('Wrapper')
    ).deploy(light.address, weth.address)
    await wrapper.deployed()
  })

  describe('Test wraps', async () => {
    it('test wrapped swap succeeds', async () => {
      const order = await createSignedOrder(
        {
          senderToken: weth.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      await expect(
        wrapper.connect(sender).swap(...order, { value: DEFAULT_AMOUNT })
      ).to.emit(light, 'Swap')
    })
  })
})
