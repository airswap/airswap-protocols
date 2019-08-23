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

module.exports = {
  DOMAIN_NAME: 'SWAP',
  DOMAIN_VERSION: '2',
  SECONDS_IN_DAY: 86400,
  EMPTY_ADDRESS: '0x0000000000000000000000000000000000000000',
  ONE_ETH: 1000000000000000000,
  ERC721_INTERFACE_ID: '0x80ac58cd',
  ERC20_INTERFACE_ID: '0x277f8169',
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Order: [
      { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'maker', type: 'Party' },
      { name: 'taker', type: 'Party' },
      { name: 'affiliate', type: 'Party' },
    ],
    Party: [
      { name: 'wallet', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'param', type: 'uint256' },
      { name: 'kind', type: 'bytes4' },
    ],
  },
  defaults: {
    Party: {
      wallet: '0x0000000000000000000000000000000000000000',
      token: '0x0000000000000000000000000000000000000000',
      param: 0,
      kind: '0x277f8169',
    },
  },
}
