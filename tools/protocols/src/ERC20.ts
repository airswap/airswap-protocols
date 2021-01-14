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

import * as IERC20 from '@airswap/tokens/build/contracts/IERC20.json'
const IERC20Interface = new ethers.utils.Interface(JSON.stringify(IERC20.abi))

export class ERC20 {
  public chainId: string
  public address: string
  private contract: ethers.Contract

  public constructor(
    address: string,
    chainId = chainIds.RINKEBY,
    walletOrProvider?: ethers.Wallet | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.address = address
    this.contract = new ethers.Contract(
      address,
      IERC20Interface,
      walletOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public async balanceOf(address: string): Promise<ethers.BigNumber> {
    return await this.contract.balanceOf(address)
  }
}
