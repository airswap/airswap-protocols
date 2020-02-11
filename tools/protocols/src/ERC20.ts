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
import { chainIds, chainNames } from '@airswap/constants'
import { BigNumber } from 'ethers/utils'

const IERC20 = require('@airswap/tokens/build/contracts/IERC20.json')

export class ERC20 {
  address: string
  chainId: string
  contract: any

  constructor(
    address: string,
    chainId = chainIds.RINKEBY,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ) {
    this.address = address
    this.chainId = chainId
    this.contract = new ethers.Contract(
      address,
      IERC20.abi,
      signerOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  async balanceOf(address: string): Promise<BigNumber> {
    return await this.contract.balanceOf(address)
  }
}
