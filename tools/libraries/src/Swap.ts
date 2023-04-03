import { ethers, ContractTransaction } from 'ethers'
import type { Provider } from '@ethersproject/providers'
import { chainIds } from '@airswap/constants'
import { Order } from '@airswap/types'
import { Swap as SwapContract } from '@airswap/swap/typechain/contracts'
import { Swap__factory } from '@airswap/swap/typechain/factories/contracts'
import { checkResultToErrors } from '@airswap/utils'

import * as swapDeploys from '@airswap/swap/deploys.js'

export class Swap {
  public chainId: number
  public contract: SwapContract

  public constructor(
    chainId = chainIds.MAINNET,
    signerOrProvider?: ethers.Signer | Provider
  ) {
    this.chainId = chainId
    this.contract = Swap__factory.connect(
      Swap.getAddress(chainId),
      signerOrProvider
    )
  }

  public static getAddress(chainId = chainIds.MAINNET): string {
    if (chainId in swapDeploys) {
      return swapDeploys[chainId]
    }
    throw new Error(`Swap contract not found for chainId ${chainId}`)
  }

  public async check(
    order: Order,
    senderWallet: string,
    signer?: ethers.providers.JsonRpcSigner
  ): Promise<Array<string>> {
    let contract = this.contract
    if (!this.contract.signer) {
      if (signer === undefined) {
        throw new Error('Signer must be provided')
      } else {
        contract = contract.connect(signer)
      }
    }
    const [errors, count] = await contract.check(order)
    return checkResultToErrors(count, errors)
  }

  public async swap(
    order: Order,
    maxRoyalty: string,
    sender?: ethers.providers.JsonRpcSigner
  ): Promise<ContractTransaction> {
    let contract = this.contract
    if (!this.contract.signer) {
      if (sender === undefined) {
        throw new Error('Signer must be provided')
      } else {
        contract = contract.connect(sender)
      }
    }
    return await contract.swap(sender.getAddress(), maxRoyalty, order)
  }

  public async cancel(
    nonces: Array<string>,
    sender?: ethers.providers.JsonRpcSigner
  ): Promise<ContractTransaction> {
    let contract = this.contract
    if (!this.contract.signer) {
      if (sender === undefined) {
        throw new Error('Signer must be provided')
      } else {
        contract = contract.connect(sender)
      }
    }
    return await contract.cancel(nonces)
  }
}
