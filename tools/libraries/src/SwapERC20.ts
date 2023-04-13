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
    signerOrProvider: ethers.Signer | Provider
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
    throw new Error(`SwapERC20 not available for chainId ${chainId}`)
  }

  public async check(
    order: OrderERC20,
    senderWallet?: string
  ): Promise<Array<string>> {
    const [count, errors] = await this.contract.check(
      senderWallet || (await this.contract.signer.getAddress()),
      ...orderERC20ToParams(order)
    )
    return checkResultToErrors(count, errors)
  }

  public async swap(order: OrderERC20): Promise<ContractTransaction> {
    return await this.contract.swap(
      await this.contract.signer.getAddress(),
      ...orderERC20ToParams(order)
    )
  }

  public async swapAnySender(order: OrderERC20): Promise<ContractTransaction> {
    return await this.contract.swapAnySender(
      await this.contract.signer.getAddress(),
      ...orderERC20ToParams(order)
    )
  }

  public async swapLight(order: OrderERC20): Promise<ContractTransaction> {
    return await this.contract.swapLight(...orderERC20ToParams(order))
  }
}
