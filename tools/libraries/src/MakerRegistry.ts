import { ethers } from 'ethers'
import type { Provider } from '@ethersproject/providers'
import { MakerRegistry as MakerRegistryContract } from '@airswap/maker-registry/typechain/contracts'
import { MakerRegistry__factory } from '@airswap/maker-registry/typechain/factories/contracts'
import { chainIds } from '@airswap/constants'

import { Maker, MakerOptions } from './Maker'
import { SwapERC20 } from './SwapERC20'

import * as registryDeploys from '@airswap/maker-registry/deploys.js'

export class MakerRegistry {
  public chainId: number
  private contract: MakerRegistryContract

  public constructor(
    chainId = chainIds.GOERLI,
    signerOrProvider?: ethers.Signer | Provider
  ) {
    this.chainId = chainId
    this.contract = MakerRegistry__factory.connect(
      MakerRegistry.getAddress(chainId),
      signerOrProvider
    )
  }

  public static getAddress(chainId = chainIds.GOERLI): string {
    if (chainId in registryDeploys) {
      return registryDeploys[chainId]
    }
    throw new Error(`MakerRegistry deploy not found for chainId ${chainId}`)
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
            initializeTimeout: options?.initializeTimeout,
          })
        })
    )
    return serverPromises
      .filter((value) => value.status === 'fulfilled')
      .map((v: PromiseFulfilledResult<Maker>) => v.value)
  }
}
