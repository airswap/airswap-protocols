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

import {
  tokenKinds,
  signatureTypes,
  ADDRESS_ZERO,
  LOCATOR_ZERO,
} from '@airswap/constants'

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

export type Party = {
  kind: string
  token: string
  id?: string
  amount?: string
}

export type OrderParty = Party & {
  wallet: string
}

export type Quote = {
  timestamp?: string
  protocol?: string
  locator?: string
  signer: Party
  sender: Party
}

export type UnsignedOrder = {
  nonce: string
  expiry: string
  signer: OrderParty
  sender: OrderParty
  affiliate: OrderParty
}

export type Signature = {
  version: string
  signatory: string
  validator: string
  v: string
  r: string
  s: string
}

export type Order = UnsignedOrder & {
  signature: Signature
}

export type LightSignature = {
  v: string
  r: string
  s: string
}

export type UnsignedLightOrder = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  signerFee: string
  senderWallet: string
  senderToken: string
  senderAmount: string
}

export type LightOrder = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  senderToken: string
  senderAmount: string
} & LightSignature

export type Token = {
  address: string
  symbol: string
  decimals: number
}

export type LocatorResult = {
  locators: Array<string>
  scores: Array<string>
  nextCursor: string
}

export const EIP712 = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Order: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'signer', type: 'Party' },
    { name: 'sender', type: 'Party' },
    { name: 'affiliate', type: 'Party' },
  ],
  Party: [
    { name: 'kind', type: 'bytes4' },
    { name: 'wallet', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'id', type: 'uint256' },
  ],
}

export const EIP712Light = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  LightOrder: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'signerWallet', type: 'address' },
    { name: 'signerToken', type: 'address' },
    { name: 'signerAmount', type: 'uint256' },
    { name: 'signerFee', type: 'uint256' },
    { name: 'senderWallet', type: 'address' },
    { name: 'senderToken', type: 'address' },
    { name: 'senderAmount', type: 'uint256' },
  ],
}

export const emptyParty: Party = {
  kind: tokenKinds.ERC20,
  token: ADDRESS_ZERO,
  amount: '0',
  id: '0',
}

export const emptyOrderParty: OrderParty = {
  wallet: ADDRESS_ZERO,
  kind: tokenKinds.ERC20,
  token: ADDRESS_ZERO,
  amount: '0',
  id: '0',
}

export const emptySignature: Signature = {
  version: signatureTypes.PERSONAL_SIGN,
  signatory: ADDRESS_ZERO,
  validator: ADDRESS_ZERO,
  r: LOCATOR_ZERO,
  s: LOCATOR_ZERO,
  v: '0',
}
