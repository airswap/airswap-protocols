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

module.exports = {
  DOMAIN_NAME: 'SWAP',
  DOMAIN_VERSION: '2',
  SECONDS_IN_DAY: 86400,
  EMPTY_ADDRESS: '0x0000000000000000000000000000000000000000',
  HEAD: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
  KNOWN_GANACHE_WALLET: '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA',
  LOCATORS: 0,
  SCORES: 1,
  NEXTID: 2,
  ONE_ETH: 1000000000000000000,
  ERC721_INTERFACE_ID: '0x80ac58cd',
  ERC20_INTERFACE_ID: '0x36372b07',
  ERC1155_INTERFACE_ID: '0xd9b67a26',
  CK_INTERFACE_ID: '0x9a20483d',
  GANACHE_PROVIDER: 'http://127.0.0.1:8545',
  signatures: {
    INTENDED_VALIDATOR: '0x00',
    SIGN_TYPED_DATA: '0x01',
    PERSONAL_SIGN: '0x45',
  },
  types: {
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
  },
  defaults: {
    Party: {
      kind: '0x36372b07',
      wallet: '0x0000000000000000000000000000000000000000',
      token: '0x0000000000000000000000000000000000000000',
      amount: '0',
      id: '0',
    },
  },
}
