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

import { Token } from '@airswap/types'

export const rinkebyTokens: Record<string, Token> = {
  DAI: {
    address: '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea',
    decimals: 18,
    symbol: 'DAI',
  },
  WETH: {
    address: '0xc778417e063141139fce010982780140aa0cd5ab',
    decimals: 18,
    symbol: 'WETH',
  },
  AST: {
    address: '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8',
    decimals: 4,
    symbol: 'AST',
  },
}
