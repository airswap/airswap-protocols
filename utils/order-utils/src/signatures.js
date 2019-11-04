/*
  Copyright 2019 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')
const {
  DOMAIN_NAME,
  DOMAIN_VERSION,
  EMPTY_ADDRESS,
  signatures,
  types,
} = require('./constants')
const hashes = require('./hashes')

module.exports = {
  async getWeb3Signature(order, signatory, verifyingContract) {
    const orderHash = hashes.getOrderHash(order, verifyingContract)
    const orderHashHex = ethUtil.bufferToHex(orderHash)
    const sig = await web3.eth.sign(orderHashHex, signatory)
    const { v, r, s } = ethUtil.fromRpcSig(sig)
    return {
      signatory: signatory,
      validator: verifyingContract,
      version: signatures.PERSONAL_SIGN,
      v,
      r,
      s,
    }
  },
  getPrivateKeySignature(order, privateKey, verifyingContract) {
    const orderHash = hashes.getOrderHash(order, verifyingContract)
    const orderHashBuff = ethUtil.toBuffer(orderHash)
    const { v, r, s } = ethUtil.ecsign(orderHashBuff, privateKey)
    return {
      signatory: ethUtil.privateToAddress(privateKey).toString('hex'),
      validator: verifyingContract,
      version: signatures.SIGN_TYPED_DATA,
      v,
      r,
      s,
    }
  },
  getPersonalSignature(order, privateKey, verifyingContract) {
    const orderHash = hashes.getOrderHash(order, verifyingContract)
    const sig = sigUtil.personalSign(privateKey, {
      data: orderHash,
    })
    const { v, r, s } = ethUtil.fromRpcSig(sig)
    return {
      signatory: `0x${ethUtil.privateToAddress(privateKey).toString('hex')}`,
      validator: verifyingContract,
      version: signatures.PERSONAL_SIGN,
      v,
      r,
      s,
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
    const { v, r, s } = ethUtil.fromRpcSig(sig)
    return {
      signatory: `0x${ethUtil.privateToAddress(privateKey).toString('hex')}`,
      validator: verifyingContract,
      version: signatures.SIGN_TYPED_DATA,
      v,
      r,
      s,
    }
  },
  getEmptySignature() {
    return {
      signatory: EMPTY_ADDRESS,
      validator: EMPTY_ADDRESS,
      version: signatures.INTENDED_VALIDATOR,
      v: '0',
      r: '0x0',
      s: '0x0',
    }
  },
}
