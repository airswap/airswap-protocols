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

export const DOMAIN_NAME = 'SWAP'
export const DOMAIN_VERSION = '2'
export const LIGHT_DOMAIN_NAME = 'SWAP_LIGHT'
export const LIGHT_DOMAIN_VERSION = '3'
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
  GOERLI: '5',
  KOVAN: '42',
  BINANCE: '56',
}

export const chainNames: Record<string, string> = {
  '1': 'MAINNET',
  '4': 'RINKEBY',
  '5': 'GOERLI',
  '42': 'KOVAN',
  '56': 'BINANCE',
}

export const chainCurrencies: Record<string, string> = {
  '1': 'ETH',
  '4': 'Rinkeby ETH',
  '5': 'Goerli ETH',
  '42': 'Kovan ETH',
  '56': 'BNB',
}

export enum TokenKinds {
  ERC20 = '0x36372b07',
  ERC721 = '0x80ac58cd',
  ERC1155 = '0xd9b67a26',
  CKITTY = '0x9a20483d',
}

export const tokenKinds = {
  ERC20: TokenKinds.ERC20,
  ERC721: TokenKinds.ERC721,
  ERC1155: TokenKinds.ERC1155,
  CKITTY: TokenKinds.CKITTY,
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

export const wethAddresses: Record<string, string> = {
  '1': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  '4': '0xc778417e063141139fce010982780140aa0cd5ab',
  '5': '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
  '42': '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
}

export const stakingTokenAddresses: Record<string, string> = {
  '1': '0x27054b13b1b798b345b591a4d22e6562d47ea75a',
  '4': '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8',
  '5': '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
  '42': '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
  '56': '0x1ac0d76f11875317f8a7d791db94cdd82bd02bd1',
}

export const balanceCheckerAddresses: Record<string, string> = {
  '1': '0x5dfe850d4b029c25c7ef9531ec9986c97d90300f',
  '4': '0xa1e2c4132cbd33c3876e1254143a850466c97e32',
  '5': '0x755aa03f420a62560e90502d7da23a73c301dad4',
  '42': '0xe25b7504856bfb230b7c32bc87047479815cbc70',
}

export const etherscanDomains: Record<string, string> = {
  '1': 'etherscan.io',
  '4': 'rinkeby.etherscan.io',
  '5': 'goerli.etherscan.io',
  '42': 'kovan.etherscan.io',
  '56': 'bscscan.com',
}
