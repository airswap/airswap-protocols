import { ethers } from 'ethers'
import { ServerOptions } from '@airswap/types'
import { MakerRegistry__factory } from '@airswap/maker-registry/typechain/factories/contracts'
// @ts-ignore
import registryDeploys from '@airswap/maker-registry/deploys.js'

import { Server } from './Server'
import { Contract, SwapERC20 } from './Contracts'

const registryBlocks = {
  1: 12782029,
  5: 6537104,
  30: 5018400,
  31: 3424107,
  56: 15963896,
  97: 17263882,
  137: 26036024,
  42161: 43864138,
  43113: 6864382,
  43114: 11969746,
  59140: 992371,
  59144: 0,
  80001: 25550814,
  421613: 2333984,
}

class ServerRegistry extends Contract {
  public constructor() {
    super('Registry', registryDeploys, registryBlocks, MakerRegistry__factory)
  }
  public async getServerURLs(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    baseToken: string,
    quoteToken: string
  ): Promise<string[]> {
    const contract = MakerRegistry__factory.connect(
      registryDeploys[chainId],
      providerOrSigner
    )
    const signerTokenURLs = await contract.getURLsForToken(baseToken)
    const senderTokenURLs = await contract.getURLsForToken(quoteToken)
    return signerTokenURLs.filter((value) => senderTokenURLs.includes(value))
  }
  public async getServers(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    baseToken: string,
    quoteToken: string,
    options?: ServerOptions
  ): Promise<Array<Server>> {
    const urls = await this.getServerURLs(
      providerOrSigner,
      chainId,
      baseToken,
      quoteToken
    )
    const serverPromises = await Promise.allSettled(
      urls.map((url) => {
        return Server.at(url, {
          swapContract: options?.swapContract || SwapERC20.addresses[chainId],
          chainId: chainId,
          initializeTimeout: options?.initializeTimeout,
        })
      })
    )
    const servers: PromiseFulfilledResult<Server>[] = serverPromises.filter(
      (value): value is PromiseFulfilledResult<Server> =>
        value.status === 'fulfilled'
    )
    return servers.map((value) => value.value)
  }
}
export const Registry = new ServerRegistry()
