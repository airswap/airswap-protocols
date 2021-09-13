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
import { Server } from './Server'
import { Light } from './Light'

import * as RegistryContract from '@airswap/registry/build/contracts/Registry.sol/Registry.json'
import * as registryDeploys from '@airswap/registry/deploys.js'
const RegistryInterface = new ethers.utils.Interface(
  JSON.stringify(RegistryContract.abi)
)

export class Registry {
  public chainId: number
  private contract: ethers.Contract

  public constructor(
    chainId = chainIds.RINKEBY,
    walletOrProvider?: ethers.Wallet | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = new ethers.Contract(
      registryDeploys[chainId],
      RegistryInterface,
      walletOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public static getAddress(chainId = chainIds.RINKEBY): string {
    if (chainId in registryDeploys) {
      return registryDeploys[chainId]
    }
    throw new Error(`Registry deploy not found for chainId ${chainId}`)
  }

  public async getServers(
    signerToken: string,
    senderToken: string
  ): Promise<Array<Server>> {
    const signerTokenURLs = await this.contract.getURLsForToken(signerToken)
    const senderTokenURLs = await this.contract.getURLsForToken(senderToken)
    const servers: Server[] = await Promise.all(
      signerTokenURLs
        .filter(value => senderTokenURLs.includes(value))
        .map(url => {
          return Server.for(url, Light.getAddress(this.chainId))
        })
    )
    return servers
  }
}
