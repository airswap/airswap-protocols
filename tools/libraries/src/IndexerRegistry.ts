import * as indexerRegistryDeploys from '@airswap/indexer-registry/deploys.js'
import { providers, getDefaultProvider } from 'ethers'
import {
  IndexerRegistry__factory,
  IndexerRegistry as IndexerRegistryContract,
} from '@airswap/indexer-registry/typechain-types'
import { chainIds } from '@airswap/constants'

export class IndexerRegistry {
  public chainId: number
  public contract: IndexerRegistryContract

  public constructor(
    chainId = chainIds.RINKEBY,
    signerOrProvider?: providers.JsonRpcSigner | providers.Provider
  ) {
    this.chainId = chainId
    this.contract = IndexerRegistry__factory.connect(
      IndexerRegistry.getAddress(chainId),
      signerOrProvider || getDefaultProvider(chainId)
    )
  }
  public static getAddress(chainId = chainIds.RINKEBY) {
    if (chainId in indexerRegistryDeploys) {
      return indexerRegistryDeploys[chainId]
    }
    throw new Error(`Wrapper deploy not found for chainId ${chainId}`)
  }
}
