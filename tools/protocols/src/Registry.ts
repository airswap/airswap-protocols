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
  ): Promise<Array<any>> {
    const signerTokenURLs = await this.contract.getURLsForToken(signerToken)
    const senderTokenURLs = await this.contract.getURLsForToken(senderToken)
    return signerTokenURLs
      .filter((value) => senderTokenURLs.includes(value))
      .map((url) => {
        return new Server(url, Light.getAddress(this.chainId))
      })
  }
}
