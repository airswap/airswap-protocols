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
import * as sigUtil from 'eth-sig-util'
import { ethers } from 'ethers'
import {
  signatureTypes,
  SECONDS_IN_DAY,
  tokenKinds,
  ADDRESS_ZERO,
  LIGHT_DOMAIN_VERSION,
  LIGHT_DOMAIN_NAME,
} from '@airswap/constants'
import {
  Quote,
  UnsignedOrder,
  Order,
  Signature,
  UnsignedLightOrder,
  EIP712Light,
  OrderParty,
} from '@airswap/types'
import { getOrderHash } from './hashes'
import { lowerCaseAddresses } from '..'

export function numberToBytes32(number): string {
  const hexString = number.toString(16)
  return `0x${hexString.padStart(64, '0')}`
}

export function formatPartyData({
  kind = tokenKinds.ERC20, // default to ERC20
  wallet = ADDRESS_ZERO,
  token = ADDRESS_ZERO,
  amount = 0,
  id = 0,
  transferData = '',
}): OrderParty {
  let data
  switch (kind) {
    case tokenKinds.ERC20:
      data = numberToBytes32(amount)
      break
    case tokenKinds.ERC721:
    case tokenKinds.CKITTY:
      data = numberToBytes32(id)
      break
    case tokenKinds.ERC1155:
      data = numberToBytes32(id)
        .concat(numberToBytes32(amount).slice(2))
        .concat(transferData)
      break
    default:
      data = '0x'
  }
  return {
    kind,
    wallet,
    token,
    data,
  }
}

export function createOrder({
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  nonce = Date.now(),
  signer = {},
  sender = {},
  affiliate = {},
}): UnsignedOrder {
  return lowerCaseAddresses({
    expiry: String(expiry),
    nonce: String(nonce),
    signer: formatPartyData(signer),
    sender: formatPartyData(sender),
    affiliate: formatPartyData(affiliate),
  })
}

export function parseOrderFromHex(data: string): object {
  const functionNames = {
    '0x67641c2f': 'swap',
    '0xc7d26c86': 'delegateProvideOrder',
    '0x7a2d107c': 'provideOrder',
  }

  const response = {
    functionName: functionNames[data.slice(0, 10)],
    order: {
      nonce: `${ethers.BigNumber.from('0x' + data.slice(10, 74))}`,
      expiry: `${ethers.BigNumber.from('0x' + data.slice(74, 138))}`,
      signer: {
        kind: `0x${data.slice(138, 146)}`,
        wallet: `0x${data.slice(226, 266)}`,
        token: `0x${data.slice(290, 330)}`,
        amount: `${ethers.BigNumber.from('0x' + data.slice(330, 394))}`,
        id: `${ethers.BigNumber.from('0x' + data.slice(394, 458))}`,
      },
      sender: {
        kind: `0x${data.slice(458, 466)}`,
        wallet: `0x${data.slice(546, 586)}`,
        token: `0x${data.slice(610, 650)}`,
        amount: `${ethers.BigNumber.from('0x' + data.slice(650, 714))}`,
        id: `${ethers.BigNumber.from('0x' + data.slice(714, 778))}`,
      },
      affiliate: {
        kind: `0x${data.slice(778, 786)}`,
        wallet: `0x${data.slice(866, 906)}`,
        token: `0x${data.slice(930, 970)}`,
        amount: `${ethers.BigNumber.from('0x' + data.slice(970, 1034))}`,
        id: `${ethers.BigNumber.from('0x' + data.slice(1034, 1098))}`,
      },
      signature: {
        signatory: `0x${data.slice(1122, 1162)}`,
        validator: `0x${data.slice(1186, 1226)}`,
        version: `0x${data.slice(1226, 1228)}`,
        v: `${ethers.BigNumber.from('0x' + data.slice(1352, 1354))}`,
        r: `0x${data.slice(1354, 1418)}`,
        s: `0x${data.slice(1418, 1482)}`,
      },
    },
  }

  if (response.functionName == 'delegateProvideOrder') {
    response['delegateAddress'] = `0x${data.slice(1506, 1546)}`
  }

  return response
}

export function createOrderForQuote(
  quote: Quote,
  signerWallet: string,
  senderWallet: string
): UnsignedOrder {
  return createOrder({
    signer: {
      kind: tokenKinds.ERC20,
      token: quote.signer.token,
      amount: quote.signer.amount,
      wallet: signerWallet,
    },
    sender: {
      kind: tokenKinds.ERC20,
      token: quote.sender.token,
      amount: quote.sender.amount,
      wallet: senderWallet,
    },
  })
}

export async function createSignature(
  order: UnsignedOrder,
  wallet: ethers.Wallet,
  swapContract: string
): Promise<Signature> {
  const orderHash = getOrderHash(order, swapContract)
  const signedMsg = await wallet.signMessage(ethers.utils.arrayify(orderHash))
  const sig = ethers.utils.splitSignature(signedMsg)
  const { r, s, v } = sig

  return {
    signatory: (await wallet.getAddress()).toLowerCase(),
    validator: swapContract,
    version: signatureTypes.PERSONAL_SIGN,
    v: String(v),
    r,
    s,
  }
}

export async function signOrder(
  order: UnsignedOrder,
  wallet: ethers.Wallet,
  swapContract: string
): Promise<Order> {
  return {
    ...order,
    signature: await createSignature(order, wallet, swapContract),
  }
}

export function hasValidSignature(order) {
  const signature = order['signature']
  let hash = getOrderHash(order, signature['validator'])
  if (signature.version === '0x45') {
    const prefix = Buffer.from('\x19Ethereum Signed Message:\n')
    hash = ethUtil.keccak256(
      Buffer.concat([prefix, Buffer.from(String(hash.length)), hash])
    )
  }
  let signingPubKey
  try {
    signingPubKey = ethUtil.ecrecover(
      hash,
      signature['v'],
      signature['r'],
      signature['s']
    )
  } catch (e) {
    return false
  }
  const signingAddress = ethUtil.bufferToHex(
    ethUtil.pubToAddress(signingPubKey)
  )
  return signingAddress.toLowerCase() === signature['signatory']
}

export function isValidOrder(order: Order): boolean {
  if (
    order &&
    'nonce' in order &&
    'expiry' in order &&
    'signer' in order &&
    'sender' in order &&
    'affiliate' in order &&
    'signature' in order &&
    'wallet' in order['signer'] &&
    'wallet' in order['sender'] &&
    'wallet' in order['affiliate'] &&
    'token' in order['signer'] &&
    'token' in order['sender'] &&
    'token' in order['affiliate'] &&
    'data' in order['signer'] &&
    'data' in order['sender'] &&
    'data' in order['affiliate'] &&
    'signatory' in order['signature'] &&
    'validator' in order['signature'] &&
    'r' in order['signature'] &&
    's' in order['signature'] &&
    'v' in order['signature']
  ) {
    return hasValidSignature(order)
  }
  return false
}

export async function createLightSignature(
  unsignedOrder: UnsignedLightOrder,
  privateKey: string,
  swapContract: string,
  chainId: number
): Promise<string> {
  const sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(privateKey), {
    data: {
      types: EIP712Light,
      domain: {
        name: LIGHT_DOMAIN_NAME,
        version: LIGHT_DOMAIN_VERSION,
        chainId,
        verifyingContract: swapContract,
      },
      primaryType: 'LightOrder',
      message: unsignedOrder,
    },
  })

  const v = ethers.utils.splitSignature(sig).v
  return `${sig.slice(0, 130)}${(v === 0 || v === 1 ? v + 27 : v).toString(16)}`
}

export function getSignerFromLightSignature(
  order: UnsignedLightOrder,
  swapContract: string,
  chainId: number,
  signature: string
) {
  return sigUtil.recoverTypedSignature_v4({
    data: {
      types: EIP712Light,
      domain: {
        name: LIGHT_DOMAIN_NAME,
        version: LIGHT_DOMAIN_VERSION,
        chainId,
        verifyingContract: swapContract,
      },
      primaryType: 'LightOrder',
      message: order,
    },
    sig: signature,
  })
}
