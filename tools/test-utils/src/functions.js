/*
  Copyright 2020 Swap Holdings Ltd.

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

// const ethUtil = require('ethereumjs-util')
// const sigUtil = require('eth-sig-util')
const ethers = require('ethers')
// const {
//   DOMAIN_NAME,
//   DOMAIN_VERSION,
//   signatureTypes,
// } = require('@airswap/constants')
// const { EIP712 } = require('@airswap/types')

module.exports = {
  getTestWallet: function(network = 'rinkeby') {
    const signerPrivateKey =
      '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
    const provider = ethers.getDefaultProvider(network)
    return new ethers.Wallet(signerPrivateKey, provider)
  },
  // getTypedDataSignature: function(order, privateKey, verifyingContract) {
  //   const sig = sigUtil.signTypedData(privateKey, {
  //     data: {
  //       types: EIP712,
  //       domain: {
  //         name: DOMAIN_NAME,
  //         version: DOMAIN_VERSION,
  //         verifyingContract,
  //       },
  //       primaryType: 'Order',
  //       message: order,
  //     },
  //   })
  //   const { v, r, s } = ethUtil.fromRpcSig(sig)
  //   return {
  //     signatory: `0x${ethUtil
  //       .privateToAddress(privateKey)
  //       .toString('hex')}`.toLowerCase(),
  //     validator: verifyingContract.toLowerCase(),
  //     version: signatureTypes.SIGN_TYPED_DATA,
  //     v,
  //     r,
  //     s,
  //   }
  // },
}
