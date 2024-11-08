import type { ethers } from 'ethers'
import { Registry__factory } from 'registry-v3/typechain/factories/contracts'

import { Contract, SwapERC20 } from './Contracts'
import { Server } from './Server'

const registryDeploys = {
  1: '0x8F9DA6d38939411340b19401E8c54Ea1f51B8f95',
  5: '0x05545815a5579d80Bd4c380da3487EAC2c4Ce299',
  30: '0xE0EE84592b12cfcd03843DE12b58852879ee6FF5',
  31: '0x517d482F686f11b922EED764692f2b42663ce2fa',
  56: '0x9F11691FA842856E44586380b27Ac331ab7De93d',
  97: '0x05545815a5579d80Bd4c380da3487EAC2c4Ce299',
  137: '0x9F11691FA842856E44586380b27Ac331ab7De93d',
  42161: '0xaBF694A434E0fE3b951409C01aa2db50Af4D2E3A',
  43113: '0x4F290e83B414097C107F5AD483a9ae15434B43d3',
  43114: '0xE40feb39fcb941A633deC965Abc9921b3FE962b2',
  80001: '0x05545815a5579d80Bd4c380da3487EAC2c4Ce299',
  421613: '0x517d482F686f11b922EED764692f2b42663ce2fa',
}

const registryBlocks = {
  1: 0,
  5: 0,
  30: 0,
  31: 0,
  56: 0,
  97: 0,
  137: 0,
  42161: 0,
  43113: 0,
  43114: 0,
  80001: 0,
  421613: 0,
}

class ServerRegistry extends Contract {
  public constructor() {
    super('Registry', registryDeploys, registryBlocks, Registry__factory)
  }
  public async getServerURLs(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    baseToken: string,
    quoteToken: string,
    address: any = registryDeploys[chainId]
  ): Promise<string[]> {
    const contract = Registry__factory.connect(address, providerOrSigner)
    const baseTokenURLs: string[] = await contract.getURLsForToken(baseToken)
    const quoteTokenURLs: string[] = await contract.getURLsForToken(quoteToken)
    return baseTokenURLs.filter((baseTokenURL) =>
      quoteTokenURLs.includes(baseTokenURL)
    )
  }
  public async getServers(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    baseToken: string,
    quoteToken: string,
    address: any = registryDeploys[chainId]
  ): Promise<Array<Server>> {
    const urls = await this.getServerURLs(
      providerOrSigner,
      chainId,
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
export const RegistryV3 = new ServerRegistry()
