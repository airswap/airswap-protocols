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

export type Party = {
  wallet: string
  kind: string
  token: string
  amount?: string
  id?: string
}

export type Quote = {
  timestamp?: string
  protocol?: string
  locator?: string
  signer: {
    token: string
    amount: string
  }
  sender: {
    token: string
    amount: string
  }
}

export type UnsignedOrder = {
  nonce: string
  expiry: string
  signer: Party
  sender: Party
  affiliate: Party
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
