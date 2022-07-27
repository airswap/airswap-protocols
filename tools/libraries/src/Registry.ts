import { ethers } from 'ethers'
import {
  Registry__factory,
  Registry as RegistryContract,
} from '@airswap/registry/typechain-types'
import { chainIds } from '@airswap/constants'
import { Server, ServerOptions } from './Server'
import { Swap } from './Swap'

import * as registryDeploys from '@airswap/registry/deploys.js'

export class Registry {
  public chainId: number
  private contract: RegistryContract

  public constructor(
    chainId = chainIds.GOERLI,
    walletOrProvider?: ethers.Wallet | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = Registry__factory.connect(
      Registry.getAddress(chainId),
      walletOrProvider
    )
  }

  public static getAddress(chainId = chainIds.GOERLI): string {
    if (chainId in registryDeploys) {
      return registryDeploys[chainId]
    }
    throw new Error(`Registry deploy not found for chainId ${chainId}`)
  }

  public async getServers(
    quoteToken: string,
    baseToken: string,
    options?: ServerOptions
  ): Promise<Array<Server>> {
    const quoteTokenURLs: string[] = await this.contract.getURLsForToken(
      quoteToken
    )
    const baseTokenURLs: string[] = await this.contract.getURLsForToken(
      baseToken
    )
    const serverPromises = await Promise.allSettled(
      quoteTokenURLs
        .filter((value) => baseTokenURLs.includes(value))
        .map((url) => {
          return Server.at(url, {
            swapContract:
              options?.swapContract || Swap.getAddress(this.chainId),
            initializeTimeout: options?.initializeTimeout,
          })
        })
    )
    return serverPromises
      .filter((value) => value.status === 'fulfilled')
      .map((v: PromiseFulfilledResult<Server>) => v.value)
  }
}
