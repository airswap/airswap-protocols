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
const ILight = require('@airswap/light/build/contracts/Light.sol/Light.json')

describe('Wrapper Unit Tests', () => {
  let snapshotId
  let light
  let wrapper

  let weth
  let signerToken
  let senderToken

  let deployer
  let sender
  let signer

  const CHAIN_ID = 31337
  const SIGNER_FEE = '30'
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
    ;[deployer, sender, signer] = await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)

    weth = await deployMockContract(deployer, IWETH.abi)
    await weth.mock.deposit.returns()
    await weth.mock.withdraw.returns()
    await weth.mock.transferFrom.returns(true)

    light = await deployMockContract(deployer, ILight.abi)

    wrapper = await (
      await ethers.getContractFactory('Wrapper')
    ).deploy(light.address, weth.address)
    await wrapper.deployed()
  })

  describe('Test wraps', async () => {
    it('test wrapped swap fails without value', async () => {
      const order = await createSignedOrder(
        {
          senderToken: weth.address,
        },
        signer
      )
      await expect(wrapper.connect(sender).swap(...order)).to.be.revertedWith(
        'VALUE_MUST_BE_SENT'
      )
    })

    it('test wrap (deposit)', async () => {
      const order = await createSignedOrder(
        {
          senderToken: weth.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      await weth.mock.transferFrom.returns(false)
      await weth.mock.transferFrom
        .withArgs(wrapper.address, signer.address, DEFAULT_AMOUNT)
        .returns(true)

      await light.mock.swapWithRecipient.returns()

      await wrapper.connect(sender).swap(...order, { value: DEFAULT_AMOUNT })
    })

    it('test unwrap (withdraw)', async () => {
      const order = await createSignedOrder(
        {
          signerToken: weth.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      await weth.mock.transferFrom.returns(true)
      await senderToken.mock.transferFrom.returns(true)

      await light.mock.swapWithRecipient.returns()
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
