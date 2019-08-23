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
const abi = require('ethereumjs-abi')
const { DOMAIN_NAME, DOMAIN_VERSION, types } = require('./constants')

function stringify(type) {
  let str = `${type}(`
  const keys = Object.keys(types[type])
  for (let i = 0; i < keys.length; i++) {
    str += `${types[type][i].type} ${types[type][i].name}`
    if (i !== keys.length - 1) {
      str += ','
    }
  }
  return `${str})`
}

const EIP712_DOMAIN_TYPEHASH = ethUtil.keccak256(stringify('EIP712Domain'))

const ORDER_TYPEHASH = ethUtil.keccak256(
  stringify('Order') + stringify('Party')
)

const PARTY_TYPEHASH = ethUtil.keccak256(stringify('Party'))

function hashParty(party) {
  return ethUtil.keccak256(
    abi.rawEncode(
      ['bytes32', 'address', 'address', 'uint256', 'bytes4'],
      [PARTY_TYPEHASH, party.wallet, party.token, party.param, party.kind]
    )
  )
}

function hashOrder(order) {
  return ethUtil.keccak256(
    abi.rawEncode(
      ['bytes32', 'uint256', 'uint256', 'bytes32', 'bytes32', 'bytes32'],
      [
        ORDER_TYPEHASH,
        order.nonce,
        order.expiry,
        hashParty(order.maker),
        hashParty(order.taker),
        hashParty(order.affiliate),
      ]
    )
  )
}

function hashDomain(verifyingContract) {
  return ethUtil.keccak256(
    abi.rawEncode(
      ['bytes32', 'bytes32', 'bytes32', 'address'],
      [
        EIP712_DOMAIN_TYPEHASH,
        ethUtil.keccak256(DOMAIN_NAME),
        ethUtil.keccak256(DOMAIN_VERSION),
        verifyingContract,
      ]
    )
  )
}

module.exports = {
  getOrderHash(order, verifyingContract) {
    return ethUtil.keccak256(
      Buffer.concat([
        Buffer.from('1901', 'hex'),
        hashDomain(verifyingContract),
        hashOrder(order),
      ])
    )
  },
  hashParty,
  hashDomain,
  hashOrder,
}
