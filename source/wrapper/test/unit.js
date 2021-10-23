const { expect } = require('chai')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle

const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IWETH = require('../build/contracts/interfaces/IWETH.sol/IWETH.json')
const LIGHT = require('@airswap/light/build/contracts/Light.sol/Light.json')

describe('Wrapper Unit Tests', () => {
  let snapshotId
  let light
  let wrapper

  let wethToken
  let signerToken
  let senderToken
  let stakingToken

  let deployer
  let sender
  let signer
  let protocolFeeWallet

  const CHAIN_ID = 31337
  const PROTOCOL_FEE = '30'
  const PROTOCOL_FEE_LIGHT = '7'
  const DEFAULT_AMOUNT = '10000'
  const REBATE_SCALE = '10'
  const REBATE_MAX = '100'

  async function createSignedOrder(params, signer) {
    const unsignedOrder = createLightOrder({
      protocolFee: PROTOCOL_FEE,
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
    ;[deployer, sender, signer, protocolFeeWallet] = await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    stakingToken = await deployMockContract(deployer, IERC20.abi)

    await senderToken.mock.approve.returns(true)
    await senderToken.mock.allowance.returns('0')
    await senderToken.mock.transferFrom.returns(true)

    await signerToken.mock.transferFrom.returns(true)
    await signerToken.mock.transfer.returns(true)

    await stakingToken.mock.balanceOf.returns('0')

    wethToken = await deployMockContract(deployer, IWETH.abi)
    await wethToken.mock.approve.returns(true)
    await wethToken.mock.deposit.returns()
    await wethToken.mock.withdraw.returns()
    await wethToken.mock.transferFrom.returns(true)

    light = await (
      await ethers.getContractFactory(LIGHT.abi, LIGHT.bytecode)
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      REBATE_SCALE,
      REBATE_MAX,
      stakingToken.address
    )
    await light.deployed()

    wrapper = await (
      await ethers.getContractFactory('Wrapper')
    ).deploy(light.address, wethToken.address)
    await wrapper.deployed()
  })

  describe('Test light config', async () => {
    it('test changing light contract by non-owner', async () => {
      await expect(
        wrapper.connect(sender).setLightContract(light.address)
      ).to.be.revertedWith('owner')
    })
    it('test changing light contract', async () => {
      await wrapper.connect(deployer).setLightContract(light.address)

      const storedLightContract = await wrapper.lightContract()
      await expect(await storedLightContract).to.equal(light.address)
    })
  })

  describe('Test wraps', async () => {
    it('test swap fails with value', async () => {
      const order = await createSignedOrder(
        {
          senderWallet: wrapper.address,
        },
        signer
      )
      await expect(
        wrapper.connect(sender).swap(...order, { value: DEFAULT_AMOUNT })
      ).to.be.revertedWith('VALUE_MUST_BE_ZERO')
    })
    it('test wrapped swap fails without value', async () => {
      const order = await createSignedOrder(
        {
          senderToken: wethToken.address,
        },
        signer
      )
      await expect(wrapper.connect(sender).swap(...order)).to.be.revertedWith(
        'VALUE_MUST_BE_SENT'
      )
    })
    it('test swap', async () => {
      const order = await createSignedOrder(
        {
          senderWallet: wrapper.address,
        },
        signer
      )
      await wrapper.connect(sender).swap(...order)
    })
    it('test wrapped swap', async () => {
      const order = await createSignedOrder(
        {
          senderToken: wethToken.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      await wrapper.connect(sender).swap(...order, { value: DEFAULT_AMOUNT })
    })
    it('Test fallback function revert', async () => {
      await expect(
        deployer.sendTransaction({
          to: wrapper.address,
          value: 1,
        })
      ).to.be.revertedWith('DO_NOT_SEND_ETHER')
    })
  })
})
