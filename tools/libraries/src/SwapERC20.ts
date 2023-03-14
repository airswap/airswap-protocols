import { ethers, ContractTransaction } from 'ethers'
import type { Provider } from '@ethersproject/providers'
import { chainIds } from '@airswap/constants'
import { OrderERC20 } from '@airswap/types'
import { SwapERC20 as SwapContract } from '@airswap/swap-erc20/typechain/contracts'
import { SwapERC20__factory } from '@airswap/swap-erc20/typechain/factories/contracts'
import { orderERC20ToParams, checkResultToErrors } from '@airswap/utils'

import * as swapDeploys from '@airswap/swap-erc20/deploys.js'

export class SwapERC20 {
  public chainId: number
  public contract: SwapContract

  public constructor(
    chainId = chainIds.MAINNET,
    signerOrProvider?: ethers.Signer | Provider
  ) {
    this.chainId = chainId
    this.contract = SwapERC20__factory.connect(
      SwapERC20.getAddress(chainId),
      signerOrProvider
    )
  }

  public static getAddress(chainId = chainIds.MAINNET): string {
    if (chainId in swapDeploys) {
      return swapDeploys[chainId]
    }
    throw new Error(`SwapERC20 contract not found for chainId ${chainId}`)
  }

  public async check(
    order: OrderERC20,
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
    const [count, errors] = await contract.check(
      senderWallet,
      ...orderERC20ToParams(order)
    )
    return checkResultToErrors(count, errors)
  }

  public async swap(
    order: OrderERC20,
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
    return await contract.swap(
      sender.getAddress(),
      ...orderERC20ToParams(order)
    )
  }

  public async swapAnySender(
    order: OrderERC20,
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
    return await contract.swapAnySender(
      sender.getAddress(),
      ...orderERC20ToParams(order)
    )
  }

  public async swapLight(
    order: OrderERC20,
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
    return await contract.swapLight(...orderERC20ToParams(order))
  }
}
