const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const { ADDRESS_ZERO } = require('@airswap/constants')
const lightContract = require('../../light/build/contracts/Light.sol/Light.json')
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')

describe('Validator', () => {
  let deployer, sender, signer, other, feeWallet
  let light, Validator, LightFactory
  let senderToken, signerToken
  const CHAIN_ID = 31337
  const SIGNER_FEE = '30'
  const DEFAULT_AMOUNT = '1000'
  const DEFAULT_BALANCE = '10000'
  const FEE_DIVISOR = '10000'
  const SWAP_FEE =
    (parseInt(DEFAULT_AMOUNT) * parseInt(SIGNER_FEE)) / parseInt(FEE_DIVISOR)

  async function createSignedOrder(params, signatory) {
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
        signatory,
        light.address,
        CHAIN_ID
      )),
    })
  }

  async function setUpAllowances(senderAmount, signerAmount) {
    await senderToken.mock.allowance
      .withArgs(sender.address, light.address)
      .returns(senderAmount)
    await signerToken.mock.allowance
      .withArgs(signer.address, light.address)
      .returns(signerAmount)
  }

  async function setUpBalances(senderAmount, signerAmount) {
    await senderToken.mock.balanceOf
      .withArgs(sender.address)
      .returns(senderAmount)
    await signerToken.mock.balanceOf
      .withArgs(signer.address)
      .returns(signerAmount)
  }

  async function getErrorInfo(order) {
    return await Validator.connect(sender).checkSwap(...order, sender.address)
  }

  before(async () => {
    ;[deployer, sender, signer, feeWallet, other] = await ethers.getSigners()
    const ValidatorFactory = await ethers.getContractFactory('Validator')
    LightFactory = await ethers.getContractFactory(
      lightContract.abi,
      lightContract.bytecode,
      deployer
    )
    light = await LightFactory.deploy(
      feeWallet.address,
      SIGNER_FEE,
      '0',
      '0',
      ADDRESS_ZERO
    )
    await light.deployed()
    Validator = await ValidatorFactory.deploy(light.address)
    await Validator.deployed()
    senderToken = await deployMockContract(deployer, IERC20.abi)
    signerToken = await deployMockContract(deployer, IERC20.abi)
  })

  describe('constructor', () => {
    it('properly sets the light address', async () => {
      expect(await Validator.light()).to.equal(light.address)
    })
  })

  describe('checkSwap', () => {
    it('properly detects an invalid signature', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, signer)
      order[7] = '29'
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'INVALID_SIG'
      )
    })
    it('properly detects an expired order', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'EXPIRY_PASSED'
      )
    })
    it('properly detects an unauthorized signature', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, other)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'UNAUTHORIZED'
      )
    })
    it('properly detects a low signer allowance', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, 0)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, signer)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNER_ALLOWANCE_LOW'
      )
    })
    it('properly detects a low sender allowance', async () => {
      await setUpAllowances(0, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, signer)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SENDER_ALLOWANCE_LOW'
      )
    })
    it('properly detects a low signer balance', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, 0)
      const order = await createSignedOrder({}, signer)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNER_BALANCE_LOW'
      )
    })
    it('properly detects a low sender balance', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(0, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, signer)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SENDER_BALANCE_LOW'
      )
    })
    it('properly detects a nonce that has already been used', async () => {
      await senderToken.mock.transferFrom
        .withArgs(sender.address, signer.address, DEFAULT_AMOUNT)
        .returns(true)
      await signerToken.mock.transferFrom
        .withArgs(signer.address, sender.address, DEFAULT_AMOUNT)
        .returns(true)
      await signerToken.mock.transferFrom
        .withArgs(signer.address, feeWallet.address, SWAP_FEE)
        .returns(true)
      const order = await createSignedOrder(
        {
          nonce: '1',
        },
        signer
      )
      await light.connect(sender).swap(...order)
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'NONCE_ALREADY_USED'
      )
    })
    it('can detect multiple errors', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(0, DEFAULT_BALANCE)
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(2)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'EXPIRY_PASSED'
      )
      expect(ethers.utils.parseBytes32String(messages[1])).to.equal(
        'SENDER_BALANCE_LOW'
      )
    })
  })

  describe('setLightAddress', async () => {
    it('can properly set the address to a new light address', async () => {
      const newLight = await LightFactory.deploy(
        feeWallet.address,
        SIGNER_FEE,
        '0',
        '0',
        ADDRESS_ZERO
      )
      await newLight.deployed()
      await expect(Validator.setLightAddress(newLight.address)).to.not.be
        .reverted
      expect(await Validator.light()).to.equal(newLight.address)
    })

    it('will not allow a non-owner to set the light address', async () => {
      const newLight = await LightFactory.deploy(
        feeWallet.address,
        SIGNER_FEE,
        '0',
        '0',
        ADDRESS_ZERO
      )
      await newLight.deployed()
      await expect(
        Validator.connect(other).setLightAddress(newLight.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
