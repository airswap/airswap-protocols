import { ethers } from 'ethers'
import type { Provider } from '@ethersproject/providers'
import { Registry as RegistryContract } from '@airswap/registry/typechain/contracts'
import { Registry__factory } from '@airswap/registry/typechain/factories/contracts'
import { chainIds } from '@airswap/constants'

import { Maker, MakerOptions } from './Maker'
import { SwapERC20 } from './SwapERC20'

import * as registryDeploys from '@airswap/registry/deploys.js'

export class Registry {
  public chainId: number
  private contract: RegistryContract

  public constructor(
    chainId = chainIds.MAINNET,
    signerOrProvider?: ethers.Signer | Provider
  ) {
    this.chainId = chainId
    this.contract = Registry__factory.connect(
      Registry.getAddress(chainId),
      signerOrProvider
    )
  }

  public static getAddress(chainId = chainIds.MAINNET): string {
    if (chainId in registryDeploys) {
      return registryDeploys[chainId]
    }
    throw new Error(`Registry deploy not found for chainId ${chainId}`)
  }

  public async getMakers(
    quoteToken: string,
    baseToken: string,
    options?: MakerOptions
  ): Promise<Array<Maker>> {
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
          return Maker.at(url, {
            swapContract:
              options?.swapContract || SwapERC20.getAddress(this.chainId),
            chainId: this.chainId,
            initializeTimeout: options?.initializeTimeout,
          })
        })
    )
    return serverPromises
      .filter((value) => value.status === 'fulfilled')
      .map((v: PromiseFulfilledResult<Maker>) => v.value)
  }
}
