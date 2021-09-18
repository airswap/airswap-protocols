const { expect } = require('chai')
const { ethers } = require('hardhat')
const lightContract = require('../../light/build/contracts/Light.json')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')

describe('LightValidator', () => {
  let deployer, sender, signer, other, feeWallet
  let light, lightValidator
  let senderToken, signerToken
  const CHAIN_ID = 31337
  const SIGNER_FEE = '30'
  const DEFAULT_AMOUNT = '1000'

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

  before(async () => {
    ;[deployer, sender, signer, feeWallet, other] = await ethers.getSigners()
    const LightValidatorFactory = await ethers.getContractFactory(
      'LightValidator'
    )
    const LightFactory = await ethers.getContractFactory(
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
  })
  describe('checkSwap', () => {
    /* Create custom scenarios for each error
     * 1. Create an order where the signing address is the zero address
     * 2. Create a normal order, but increase the time of the blockchain beyond expiry
     * 3. Create an order where it's signed from an account different than the signerWallet
     * 4. Create a scenario where the signer allowance is set below the amount in the order
     * 5. Create a scenario where the sender allowance is set below the amount in the order
     * 6. Create a scenario where the signer balance is set below the amount in the order
     * 7. Create a scenario where the sender balance is set below the amount in the order
     * 8. Create a scenario where multiple orders are sent in succession. This can
     * be done by just marking the nonce in the Light contract as used.
     */
    it('properly detects an invalid signature', async () => {
      const order = await createSignedOrder({}, signer)
      order[7] = '29'
      await lightValidator.connect(sender).checkSwap(...order, sender.address)
    })
    // it('properly detects an expired order', () => {})
    // it('properly detects an unauthorized signature', () => {})
    // it('properly detects a low signer allowance', () => {})
    // it('properly detects a low sender allowance', () => {})
    // it('properly detects a low signer balance', () => {})
    // it('properly detects a low sender balance', () => {})
    // it('properly detects a nonce that has already been used', () => {})
    // it('can detect multiple errors', () => {})
  })
})
