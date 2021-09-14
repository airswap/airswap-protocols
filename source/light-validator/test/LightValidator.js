const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('LightValidator', () => {
  let owner, addr1, addr2
  let light, lightValidator
  beforeEach(async () => {
    /* TODO: get accounts
     * deploy light
     * deploy light-validator
     * deploy mock tokens and transfer them to the correct accounts
     */
    ;[owner, addr1, addr2] = await ethers.getSigners()
    const LightValidator = await ethers.getContractFactory('LightValidator')
    // console.log(ethers)
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
    // it('properly detects an invalid signature', () => {})
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
