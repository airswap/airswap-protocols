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

import * as ethUtil from 'ethereumjs-util'
import { ethers } from 'ethers'
import { DOMAIN_NAME, DOMAIN_VERSION } from '@airswap/constants'
import { OrderParty, UnsignedOrder, EIP712 } from '@airswap/types'

function stringify(type: string): string {
  let str = `${type}(`
  const keys = Object.keys(EIP712[type])
  for (let i = 0; i < keys.length; i++) {
    str += `${EIP712[type][i].type} ${EIP712[type][i].name}`
    if (i !== keys.length - 1) {
      str += ','
    }
  }
  return `${str})`
}

export const EIP712_DOMAIN_TYPEHASH = ethUtil.keccak256(
  stringify('EIP712Domain')
)

export const ORDER_TYPEHASH = ethUtil.keccak256(
  stringify('Order') + stringify('Party')
)

export const PARTY_TYPEHASH = ethUtil.keccak256(stringify('Party'))

export function hashParty(party: OrderParty): Buffer {
  return ethUtil.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes4', 'address', 'address', 'bytes'],
      [PARTY_TYPEHASH, party.kind, party.wallet, party.token, party.data]
    )
  )
}

export function hashOrder(order: UnsignedOrder): Buffer {
  return ethUtil.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'uint256', 'uint256', 'bytes32', 'bytes32', 'bytes32'],
      [
        ORDER_TYPEHASH,
        order.nonce,
        order.expiry,
        hashParty(order.signer),
        hashParty(order.sender),
        hashParty(order.affiliate),
      ]
    )
  )
}

export function hashDomain(swapContract: string): Buffer {
  return ethUtil.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'address'],
      [
        EIP712_DOMAIN_TYPEHASH,
        ethUtil.keccak256(DOMAIN_NAME),
        ethUtil.keccak256(DOMAIN_VERSION),
        swapContract,
      ]
    )
  )
}

export function getOrderHash(
  order: UnsignedOrder,
  swapContract: string
): Buffer {
  return ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      hashDomain(swapContract),
      hashOrder(order),
    ])
  )
}
