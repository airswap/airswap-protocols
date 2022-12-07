import { ethers, BigNumber, ContractTransaction } from 'ethers'
import { chainIds, chainNames } from '@airswap/constants'
import { OrderERC20 } from '@airswap/typescript'
import { SwapERC20 as SwapContract } from '@airswap/swap-erc20/typechain/contracts'
import { SwapERC20__factory } from '@airswap/swap-erc20/typechain/factories/contracts'
import { orderERC20ToParams } from '@airswap/utils'

import * as swapDeploys from '@airswap/swap-erc20/deploys.js'

export class SwapERC20 {
  public chainId: number
  public contract: SwapContract

  public constructor(
    chainId = chainIds.GOERLI,
    signerOrProvider?:
      | ethers.providers.JsonRpcSigner
      | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = SwapERC20__factory.connect(
      SwapERC20.getAddress(chainId),
      signerOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public static getAddress(chainId = chainIds.GOERLI): string {
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
    return this.convertToArray(count, errors)
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

  private convertToArray(count: BigNumber, errors: Array<string>) {
    const res: Array<string> = []
    for (let idx = 0; idx < count.toNumber(); idx++) {
      res.push(ethers.utils.parseBytes32String(errors[idx]))
    }
    return res
  }
}
