import { ethers } from 'ethers'
import type { Provider } from '@ethersproject/providers'
import { IndexerRegistry as IndexerRegistryContract } from '@airswap/indexer-registry/typechain/contracts'
import { IndexerRegistry__factory } from '@airswap/indexer-registry/typechain/factories/contracts'
import { chainIds } from '@airswap/constants'

import * as indexersDeploys from '@airswap/indexer-registry/deploys.js'

export class IndexerRegistry {
  public chainId: number
  public contract: IndexerRegistryContract

  public constructor(
    chainId = chainIds.GOERLI,
    signerOrProvider?: ethers.Signer | Provider
  ) {
    this.chainId = chainId
    this.contract = IndexerRegistry__factory.connect(
      IndexerRegistry.getAddress(chainId),
      signerOrProvider
    )
  }
  public static getAddress(chainId = chainIds.GOERLI) {
    if (chainId in indexersDeploys) {
      return indexersDeploys[chainId]
    }
    throw new Error(`Wrapper deploy not found for chainId ${chainId}`)
  }
}
