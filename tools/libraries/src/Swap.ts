import { ethers, BigNumber, ContractTransaction } from 'ethers'
import { chainIds, chainNames } from '@airswap/constants'
import { Order } from '@airswap/typescript'
import { Swap as SwapContract } from '@airswap/swap/build/contracts'
import { Swap__factory } from '@airswap/swap/build/factories/contracts'
import { orderToParams } from '@airswap/utils'

import * as swapDeploys from '@airswap/swap/deploys.js'

export class Swap {
  public chainId: number
  public contract: SwapContract

  public constructor(
    chainId = chainIds.GOERLI,
    signerOrProvider?:
      | ethers.providers.JsonRpcSigner
      | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = Swap__factory.connect(
      Swap.getAddress(chainId),
      signerOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public static getAddress(chainId = chainIds.GOERLI): string {
    if (chainId in swapDeploys) {
      return swapDeploys[chainId]
    }
    throw new Error(`Swap deploy not found for chainId ${chainId}`)
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
    const [count, errors] = await contract.check(
      senderWallet,
      ...orderToParams(order)
    )
    return this.convertToArray(count, errors)
  }

  public async swap(
    order: Order,
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
    return await contract.swap(sender.getAddress(), ...orderToParams(order))
  }

  public async swapAnySender(
    order: Order,
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
      ...orderToParams(order)
    )
  }

  public async swapLight(
    order: Order,
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
    return await contract.swapLight(...orderToParams(order))
  }

  private convertToArray(count: BigNumber, errors: Array<string>) {
    const res: Array<string> = []
    for (let idx = 0; idx < count.toNumber(); idx++) {
      res.push(ethers.utils.parseBytes32String(errors[idx]))
    }
    return res
  }
}
