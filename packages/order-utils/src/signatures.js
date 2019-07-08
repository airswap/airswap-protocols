const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')
const { DOMAIN_NAME, DOMAIN_VERSION, types } = require('./constants')
const hashes = require('./hashes')

module.exports = {
  async getWeb3Signature(order, signer, verifyingContract) {
    const orderHash = hashes.getOrderHash(order, verifyingContract)
    const orderHashHex = ethUtil.bufferToHex(orderHash)
    const sig = await web3.eth.sign(orderHashHex, signer)
    const { r, s, v } = ethUtil.fromRpcSig(sig)
    return {
      version: '0x45', // Version 0x45: personal_sign
      signer,
      r,
      s,
      v,
    }
  },
  getPrivateKeySignature(order, privateKey, verifyingContract) {
    const orderHash = hashes.getOrderHash(order, verifyingContract)
    const orderHashBuff = ethUtil.toBuffer(orderHash)
    const { r, s, v } = ethUtil.ecsign(orderHashBuff, privateKey)
    return {
      version: '0x01', // Version 0x01: signTypedData
      signer: ethUtil.privateToAddress(privateKey).toString('hex'),
      r,
      s,
      v,
    }
  },
  getTypedDataSignature(order, privateKey, verifyingContract) {
    const sig = sigUtil.signTypedData(privateKey, {
      data: {
        types,
        domain: {
          name: DOMAIN_NAME,
          version: DOMAIN_VERSION,
          verifyingContract,
        },
        primaryType: 'Order',
        message: order,
      },
    })
    const { r, s, v } = ethUtil.fromRpcSig(sig)
    return {
      version: '0x01', // Version 0x01: signTypedData
      signer: ethUtil.privateToAddress(privateKey).toString('hex'),
      r,
      s,
      v,
    }
  },
  async getSimpleSignature(order, signer, verifyingContract) {
    const msg = web3.utils.soliditySha3(
      // Version 0x00: Data with intended validator (verifyingContract)
      { type: 'bytes1', value: '0x0' },
      { type: 'address', value: verifyingContract },
      { type: 'uint256', value: order.nonce },
      { type: 'uint256', value: order.expiry },
      { type: 'address', value: order.maker.wallet },
      { type: 'uint256', value: order.maker.param },
      { type: 'address', value: order.maker.token },
      { type: 'address', value: order.taker.wallet },
      { type: 'uint256', value: order.taker.param },
      { type: 'address', value: order.taker.token }
    )
    const sig = await web3.eth.sign(ethUtil.bufferToHex(msg), signer)
    return ethUtil.fromRpcSig(sig)
  },
  getEmptySignature() {
    return {
      version: '0x0',
      signer: '0x0000000000000000000000000000000000000000',
      v: '0',
      r: '0x0',
      s: '0x0',
    }
  },
}
