import { ethers } from 'ethers'
import { chainIds, chainNames } from '@airswap/constants'
import { LightOrder } from '@airswap/types'

import * as LightContract from '@airswap/light/build/contracts/Light.sol/Light.json'
import * as lightDeploys from '@airswap/light/deploys.js'
const LightInterface = new ethers.utils.Interface(
  JSON.stringify(LightContract.abi)
)

export class Light {
  public chainId: number
  private contract: ethers.Contract

  public constructor(
    chainId = chainIds.RINKEBY,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = new ethers.Contract(
      Light.getAddress(chainId),
      LightInterface,
      signerOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public static getAddress(chainId = chainIds.RINKEBY): string {
    if (chainId in lightDeploys) {
      return lightDeploys[chainId]
    }
    throw new Error(`Light deploy not found for chainId ${chainId}`)
  }

  public async swap(
    order: LightOrder,
    signer?: ethers.Signer
  ): Promise<string> {
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
      order.s
    )
  }
}
