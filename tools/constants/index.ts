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

import { OrderParty } from '@airswap/types'

export const DOMAIN_NAME = 'SWAP'
export const DOMAIN_VERSION = '2'
export const INDEX_HEAD = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const LOCATOR_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000'
export const MAX_LOCATORS = 10
export const MAX_APPROVAL_AMOUNT = '90071992547409910000000000'
export const MIN_CONFIRMATIONS = 2
export const DEFAULT_PORT = 3000
export const REQUEST_TIMEOUT = 4000
export const SECONDS_IN_DAY = 86400

export const chainIds: Record<string, string> = {
  MAINNET: '1',
  RINKEBY: '4',
}

export const chainNames: Record<string, string> = {
  '1': 'MAINNET',
  '4': 'RINKEBY',
}

export const tokenKinds: Record<string, string> = {
  ERC20: '0x36372b07',
  ERC721: '0x80ac58cd',
  ERC1155: '0xd9b67a26',
  CKITTY: '0x9a20483d',
}

export const tokenKindNames: Record<string, string> = {
  '0x36372b07': 'ERC20',
  '0x80ac58cd': 'ERC721',
  '0xd9b67a26': 'ERC1155',
  '0x9a20483d': 'CKITTY',
}

export const protocols: Record<string, string> = {
  SERVER: '0x0000',
  DELEGATE: '0x0001',
}

export const protocolNames: Record<string, string> = {
  '0x0000': 'SERVER',
  '0x0001': 'DELEGATE',
}

export const signatureTypes: Record<string, string> = {
  INTENDED_VALIDATOR: '0x00',
  SIGN_TYPED_DATA: '0x01',
  PERSONAL_SIGN: '0x45',
}

export const stakingTokenAddresses: Record<string, string> = {
  '1': '0x27054b13b1b798b345b591a4d22e6562d47ea75a',
  '4': '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8',
}

export const deltaBalanceAddresses: Record<string, string> = {
  '1': '0x5dfe850d4b029c25c7ef9531ec9986c97d90300f',
  '4': '0xa1e2c4132cbd33c3876e1254143a850466c97e32',
}

export const etherscanDomains: Record<string, string> = {
  '1': 'etherscan.io',
  '4': 'rinkeby.etherscan.io',
}

export const defaults: Record<string, OrderParty> = {
  OrderParty: {
    kind: '0x36372b07',
    wallet: '0x0000000000000000000000000000000000000000',
    token: '0x0000000000000000000000000000000000000000',
    amount: '0',
    id: '0',
  },
}
