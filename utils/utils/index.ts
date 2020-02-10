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
import { ethers } from 'ethers'
import { BigNumber } from 'ethers/utils'
import { defaults, signatureTypes, SECONDS_IN_DAY } from '@airswap/constants'
import { hashes } from '@airswap/order-utils'

function lowerCaseAddresses(obj) {
  for (let key in obj) {
    if (typeof obj[key] === 'object') {
      lowerCaseAddresses(obj[key])
    }
    if (typeof obj[key] === 'string' && obj[key].indexOf('0x') === 0) {
      obj[key] = obj[key].toLowerCase()
    }
  }
  return obj
}

export function createOrder({
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  nonce = Date.now(),
  signer = defaults.Party,
  sender = defaults.Party,
  affiliate = defaults.Party,
}): any {
  return lowerCaseAddresses({
    expiry: String(expiry),
    nonce: String(nonce),
    signer: { ...defaults.Party, ...signer },
    sender: { ...defaults.Party, ...sender },
    affiliate: { ...defaults.Party, ...affiliate },
  })
}

export function createOrderFromQuote(
  quote: any,
  signerWallet: string,
  senderWallet: string
): any {
  return createOrder({
    signer: {
      token: quote.signer.token,
      amount: quote.signer.amount,
      wallet: signerWallet,
    },
    sender: {
      token: quote.sender.token,
      amount: quote.sender.amount,
      wallet: senderWallet,
    },
  })
}

export async function signOrder(
  order: any,
  signer: ethers.Signer,
  swapContract: string
) {
  const orderHash = hashes.getOrderHash(order, swapContract)
  const signedMsg = await signer.signMessage(ethers.utils.arrayify(orderHash))
  const sig = ethers.utils.splitSignature(signedMsg)
  const { r, s, v } = sig

  return {
    signatory: await (await signer.getAddress()).toLowerCase(),
    validator: swapContract,
    version: signatureTypes.PERSONAL_SIGN,
    v: v.toString(),
    r,
    s,
  }
}

export function toDecimalString(
  value: string | BigNumber,
  decimals: string | number
): string {
  return ethers.utils.formatUnits(value.toString(), decimals).toString()
}

export function toAtomicString(
  value: string | BigNumber,
  decimals: string | number
) {
  return ethers.utils.parseUnits(value.toString(), decimals).toString()
}
