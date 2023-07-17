import { ethers } from 'ethers'
import { ServerOptions } from '@airswap/types'
import { MakerRegistry__factory } from '@airswap/maker-registry/typechain/factories/contracts'
// @ts-ignore
import registryDeploys from '@airswap/maker-registry/deploys.js'
import { RegistryBlockNumbers } from './block-numbers'

import { Server } from './Server'
import { Contract, SwapERC20 } from './Contracts'

class ServerRegistry extends Contract {
  public constructor() {
    super(
      'Registry',
      registryDeploys,
      RegistryBlockNumbers,
      MakerRegistry__factory
    )
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
          swapContract: options?.swapContract || SwapERC20.getAddress(chainId),
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
