import { ethers, ContractTransaction } from 'ethers'
import { chainIds } from '@airswap/constants'
import { Swap as SwapContract } from '@airswap/swap/typechain/contracts'
import { ISwap } from '@airswap/swap/typechain/contracts/interfaces'
import { Swap__factory } from '@airswap/swap/typechain/factories/contracts'
import { checkResultToErrors } from '@airswap/utils'

import * as swapDeploys from '@airswap/swap/deploys.js'

export class Swap {
  public contract: SwapContract
  public chainId: number
  public address: string

  public constructor(signer: ethers.Signer, address?: string) {
    this.address = address
    this.contract = Swap__factory.connect(this.address, signer)
  }

  public static getAddress(chainId = chainIds.MAINNET): string {
    if (chainId in swapDeploys) {
      return swapDeploys[chainId]
    }
    throw new Error(`Swap contract not found for chainId ${chainId}`)
  }

  public async check(order: ISwap.OrderStruct): Promise<Array<string>> {
    const contract = this.contract
    const [errors, count] = await contract.check(order)
    return checkResultToErrors(count, errors)
  }

  public async swap(
    order: ISwap.OrderStruct,
    maxRoyalty: string
  ): Promise<ContractTransaction> {
    const senderAddress = await this.contract.signer.getAddress()
    return await this.contract.swap(senderAddress, maxRoyalty, order)
  }

  public async cancel(nonces: Array<string>): Promise<ContractTransaction> {
    return await this.contract.cancel(nonces)
  }
}
