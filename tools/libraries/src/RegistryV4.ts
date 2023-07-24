import { ethers } from 'ethers'
import { ServerOptions } from '@airswap/types'
import { Registry__factory } from '@airswap/registry/typechain/factories/contracts'
import registryDeploys from '@airswap/registry/deploys.js'

import { Server } from './Server'
import { Contract, SwapERC20 } from './Contracts'

class ServerRegistry extends Contract {
  public constructor() {
    super('Registry', registryDeploys, {}, Registry__factory)
  }
  public async getServerURLs(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    protocol: string,
    baseToken?: string,
    quoteToken?: string
  ): Promise<string[]> {
    const contract = Registry__factory.connect(
      registryDeploys[chainId],
      providerOrSigner
    )
    const protocolStakers: string[] = await contract.getStakersForProtocol(
      protocol
    )
    const stakers = protocolStakers.filter(async (staker) => {
      const tokens = await contract.getTokensForStaker(staker)
      let include = false
      if (!tokens.length) include = true
      else if (baseToken) include = tokens.includes(baseToken)
      else if (quoteToken) include = tokens.includes(quoteToken)
      return include
    })
    return await contract.getServerURLsForStakers(stakers)
  }
  public async getServers(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    protocol: string,
    baseToken?: string,
    quoteToken?: string,
    options?: ServerOptions
  ): Promise<Array<Server>> {
    const urls = await this.getServerURLs(
      providerOrSigner,
      chainId,
      protocol,
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
export const RegistryV4 = new ServerRegistry()
