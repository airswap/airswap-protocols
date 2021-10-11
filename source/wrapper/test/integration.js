const { expect } = require('chai')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle

const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const WETH9 = require('@uniswap/v2-periphery/build/WETH9.json')
const LIGHT = require('@airswap/light/build/contracts/Light.sol/Light.json')

describe('Wrapper Integration Tests', () => {
  let snapshotId
  let light
  let wrapper

  let weth
  let signerToken
  let senderToken
  let stakingToken

  let deployer
  let sender
  let signer
  let feeWallet

  const CHAIN_ID = 31337
  const SIGNER_FEE = '30'
  const DEFAULT_AMOUNT = '100'
  const STAKING_REBATE_MINIMUM = '10000'

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

    weth = await (
      await ethers.getContractFactory(WETH9.abi, WETH9.bytecode)
    ).deploy()
    await weth.deployed()
    await weth.connect(signer).deposit({ value: 1000 })

    stakingToken = await deployMockContract(deployer, ERC20.abi)

    light = await (
      await ethers.getContractFactory(LIGHT.abi, LIGHT.bytecode)
    ).deploy(
      feeWallet.address,
      SIGNER_FEE,
      SIGNER_FEE,
      STAKING_REBATE_MINIMUM,
      stakingToken.address
    )
    await light.deployed()

    signerToken.connect(signer).approve(light.address, 10000)
    senderToken.connect(sender).approve(light.address, 10000)

    wrapper = await (
      await ethers.getContractFactory('Wrapper')
    ).deploy(light.address, weth.address)
    await wrapper.deployed()
  })

  describe('Test wraps', async () => {
    it('test that value is required', async () => {
      const order = await createSignedOrder(
        {
          senderToken: weth.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      await expect(wrapper.connect(sender).swap(...order)).to.be.revertedWith(
        'VALUE_MUST_BE_SENT'
      )
    })

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

    it('test that tokens require approval', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(wrapper.connect(sender).swap(...order)).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance'
      )
    })

    it('test that token swaps have no value', async () => {
      const order = await createSignedOrder({}, signer)
      await senderToken.connect(sender).approve(wrapper.address, 10000)
      await expect(
        wrapper.connect(sender).swap(...order, { value: DEFAULT_AMOUNT })
      ).to.be.revertedWith('VALUE_MUST_BE_ZERO')
    })

    it('test that unwrap works', async () => {
      const order = await createSignedOrder(
        {
          signerToken: weth.address,
          senderWallet: wrapper.address,
          senderAmount: DEFAULT_AMOUNT,
        },
        signer
      )
      // Signer approves WETH
      await weth.connect(signer).approve(light.address, DEFAULT_AMOUNT)
      // Sender approves wrapper
      await senderToken.connect(sender).approve(wrapper.address, DEFAULT_AMOUNT)
      await expect(wrapper.connect(sender).swap(...order)).to.emit(
        light,
        'Swap'
      )
    })
  })
})
