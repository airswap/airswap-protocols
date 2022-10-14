import { ContractTransaction, ethers } from 'ethers'
import { chainIds, wrappedTokenAddresses } from '@airswap/constants'
import { Wrapper as WrapperContract } from '@airswap/wrapper/typechain/contracts'
import { Wrapper__factory } from '@airswap/wrapper/typechain/factories/contracts'
import { Order } from '@airswap/typescript'

import * as wrapperDeploys from '@airswap/wrapper/deploys.js'

export class Wrapper {
  public chainId: number
  public contract: WrapperContract

  public constructor(
    chainId = chainIds.GOERLI,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = Wrapper__factory.connect(
      Wrapper.getAddress(chainId),
      signerOrProvider
    )
  }

  public static getAddress(chainId = chainIds.GOERLI): string {
    if (chainId in wrapperDeploys) {
      return wrapperDeploys[chainId]
    }
    throw new Error(`Wrapper deploy not found for chainId ${chainId}`)
  }

  public async swap(
    order: Order,
    signer?: ethers.Signer
  ): Promise<ContractTransaction> {
    let contract = this.contract
    if (!this.contract.signer) {
      if (signer === undefined) {
        throw new Error('Signer must be provided')
      } else {
        contract = contract.connect(signer)
      }
    }
    return await contract.swap(
      order.nonce,
      order.expiry,
      order.signerWallet,
      order.signerToken,
      order.signerAmount,
      order.senderToken,
      order.senderAmount,
      order.v,
      order.r,
      order.s,
      {
        value:
          order.senderToken === wrappedTokenAddresses[this.chainId]
            ? order.senderAmount
            : 0,
      }
    )
  }
}
