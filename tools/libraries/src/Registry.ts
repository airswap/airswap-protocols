import { ethers } from 'ethers'
import { Registry__factory } from '@airswap/registry/typechain/factories/contracts'
import registryDeploys from '@airswap/registry/deploys.js'
import registryBlocks from '@airswap/registry/deploys-blocks.js'

import { Server } from './Server'
import { Contract, SwapERC20 } from './Contracts'

class ServerRegistry extends Contract {
  public constructor() {
    super('Registry', registryDeploys, registryBlocks, Registry__factory)
  }
  public async getServerURLs(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    protocol: string,
    baseToken?: string,
    quoteToken?: string,
    address = registryDeploys[chainId]
  ): Promise<string[]> {
    const contract = Registry__factory.connect(address, providerOrSigner)
    const protocolStakers: string[] = await contract.getStakersForProtocol(
      protocol
    )
    const results = await Promise.all(
      protocolStakers.map(async (staker) => {
        const tokens = await contract.getTokensForStaker(staker)
        let toInclude = false
        if (baseToken)
          toInclude = tokens
            .map((token) => token.toLowerCase())
            .includes(baseToken.toLowerCase())
        else if (quoteToken)
          toInclude = tokens
            .map((token) => token.toLowerCase())
            .includes(quoteToken.toLowerCase())
        return toInclude
      })
    )
    const stakers = protocolStakers.filter((_v, index) => results[index])
    return await contract.getServerURLsForStakers(stakers)
  }
  public async getServers(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    protocol: string,
    baseToken?: string,
    quoteToken?: string,
    address = registryDeploys[chainId]
  ): Promise<Array<Server>> {
    const urls = await this.getServerURLs(
      providerOrSigner,
      chainId,
      protocol,
      baseToken,
      quoteToken,
      address
    )
    const serverPromises = await Promise.allSettled(
      urls.map((url) => {
        return Server.at(url, {
          chainId,
          swapContract: SwapERC20.addresses[chainId],
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
