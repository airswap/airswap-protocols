import * as indexersDeploys from '@airswap/indexers/deploys.js'
import { providers, getDefaultProvider } from 'ethers'
import {
  Indexers__factory,
  Indexers as IndexerRegistryContract,
} from '@airswap/indexers/typechain-types'
import { chainIds } from '@airswap/constants'

export class Indexers {
  public chainId: number
  public contract: IndexerRegistryContract

  public constructor(
    chainId = chainIds.RINKEBY,
    signerOrProvider?: providers.JsonRpcSigner | providers.Provider
  ) {
    this.chainId = chainId
    this.contract = Indexers__factory.connect(
      Indexers.getAddress(chainId),
      signerOrProvider || getDefaultProvider(chainId)
    )
  }
  public static getAddress(chainId = chainIds.RINKEBY) {
    if (chainId in indexersDeploys) {
      return indexersDeploys[chainId]
    }
    throw new Error(`Wrapper deploy not found for chainId ${chainId}`)
  }
}
