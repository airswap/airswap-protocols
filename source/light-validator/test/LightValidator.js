const { expect } = require('chai')
const { ethers } = require('hardhat')
const lightContract = require('../../light/build/contracts/Light.sol/Light.json')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')

describe('LightValidator', () => {
  let deployer, sender, signer, other, feeWallet
  let light, lightValidator, LightFactory
  let senderToken, signerToken
  const CHAIN_ID = 31337
  const SIGNER_FEE = '30'
  const DEFAULT_AMOUNT = '1000'
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

  before(async () => {
    ;[deployer, sender, signer, feeWallet, other] = await ethers.getSigners()
    const LightValidatorFactory = await ethers.getContractFactory(
      'LightValidator'
    )
    LightFactory = await ethers.getContractFactory(
      lightContract.abi,
      lightContract.bytecode,
      deployer
    )
    const TokenFactory = await ethers.getContractFactory('MockCoin')
    light = await LightFactory.deploy(feeWallet.address, SIGNER_FEE)
    await light.deployed()
    lightValidator = await LightValidatorFactory.deploy(light.address)
    await lightValidator.deployed()
    senderToken = await TokenFactory.deploy()
    signerToken = await TokenFactory.deploy()
    await senderToken.deployed()
    await signerToken.deployed()
    await senderToken.mint(sender.address, 10000)
    await signerToken.mint(signer.address, 10000)
    await senderToken.connect(sender).approve(light.address, DEFAULT_AMOUNT)
    await signerToken
      .connect(signer)
      .approve(light.address, DEFAULT_AMOUNT + SWAP_FEE)
  })

  describe('constructor', () => {
    it('properly sets the light address', async () => {
      expect(await lightValidator.light()).to.equal(light.address)
    })
  })

  describe('checkSwap', () => {
    it('properly detects an invalid signature', async () => {
      const order = await createSignedOrder({}, signer)
      order[7] = '29'
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNATURE_INVALID'
      )
    })
    it('properly detects an expired order', async () => {
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'ORDER_EXPIRED'
      )
    })
    it('properly detects an unauthorized signature', async () => {
      const order = await createSignedOrder({}, other)
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNATURE_UNAUTHORIZED'
      )
    })
    it('properly detects a low signer allowance', async () => {
      await signerToken
        .connect(signer)
        .decreaseAllowance(light.address, DEFAULT_AMOUNT + SWAP_FEE)
      const order = await createSignedOrder({}, signer)
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNER_ALLOWANCE_LOW'
      )
    })
    it('properly detects a low sender allowance', async () => {
      await signerToken
        .connect(signer)
        .increaseAllowance(light.address, DEFAULT_AMOUNT + SWAP_FEE)
      await senderToken
        .connect(sender)
        .decreaseAllowance(light.address, DEFAULT_AMOUNT)
      const order = await createSignedOrder({}, signer)
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SENDER_ALLOWANCE_LOW'
      )
    })
    it('properly detects a low signer balance', async () => {
      await senderToken
        .connect(sender)
        .increaseAllowance(light.address, DEFAULT_AMOUNT)
      await signerToken.connect(signer).transfer(other.address, 10000)
      const order = await createSignedOrder({}, signer)
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNER_BALANCE_LOW'
      )
    })
    it('properly detects a low sender balance', async () => {
      await signerToken.connect(other).transfer(signer.address, 10000)
      await senderToken.connect(sender).transfer(other.address, 10000)
      const order = await createSignedOrder({}, signer)
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SENDER_BALANCE_LOW'
      )
    })
    it('properly detects a nonce that has already been used', async () => {
      await senderToken.connect(other).transfer(sender.address, 10000)
      await signerToken
        .connect(signer)
        .approve(light.address, DEFAULT_AMOUNT + SWAP_FEE)
      const order = await createSignedOrder(
        {
          nonce: '1',
        },
        signer
      )
      await light.connect(sender).swap(...order)
      await signerToken
        .connect(signer)
        .approve(light.address, DEFAULT_AMOUNT + SWAP_FEE)
      await senderToken.connect(sender).approve(light.address, DEFAULT_AMOUNT)
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'ORDER_TAKEN_OR_CANCELLED'
      )
    })
    it('can detect multiple errors', async () => {
      await senderToken.connect(sender).transfer(other.address, 9000)
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const res = await lightValidator
        .connect(sender)
        .checkSwap(...order, sender.address)
      const [errCount, messages] = res
      expect(errCount).to.equal(2)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'ORDER_EXPIRED'
      )
      expect(ethers.utils.parseBytes32String(messages[1])).to.equal(
        'SENDER_BALANCE_LOW'
      )
    })
  })

  describe('setLightAddress', async () => {
    it('can properly set the address to a new light address', async () => {
      const newLight = await LightFactory.deploy(feeWallet.address, SIGNER_FEE)
      await newLight.deployed()
      await expect(lightValidator.setLightAddress(newLight.address)).to.not.be
        .reverted
      expect(await lightValidator.light()).to.equal(newLight.address)
    })

    it('will not allow a non-owner to set the light address', async () => {
      const newLight = await LightFactory.deploy(feeWallet.address, SIGNER_FEE)
      await newLight.deployed()
      await expect(
        lightValidator.connect(other).setLightAddress(newLight.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
