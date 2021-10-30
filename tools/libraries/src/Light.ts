import { ethers, BigNumber } from 'ethers'
import { chainIds, chainNames } from '@airswap/constants'
import { LightOrder } from '@airswap/types'
import { lightOrderToParams } from '@airswap/utils'

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

  public async validate(
    order: LightOrder,
    senderWallet: string,
    signer?: ethers.Signer
  ): Promise<Array<string>> {
    let contract = this.contract
    if (!this.contract.signer) {
      if (signer === undefined) {
        throw new Error('Signer must be provided')
      } else {
        contract = contract.connect(signer)
      }
    }
    const [count, errors] = await contract.validate(
      senderWallet,
      ...lightOrderToParams(order)
    )
    return this.convertToArray(count, errors)
  }

  public async swap(
    order: LightOrder,
    sender?: ethers.Signer
  ): Promise<string> {
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
      ...lightOrderToParams(order)
    )
  }

  private convertToArray(count: BigNumber, errors: Array<string>) {
    const res: Array<string> = []
    for (let idx = 0; idx < count.toNumber(); idx++) {
      res.push(ethers.utils.parseBytes32String(errors[idx]))
    }
    return res
  }
}
