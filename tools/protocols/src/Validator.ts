import { ethers } from 'ethers'
import { BigNumber } from 'ethers'
import { chainIds, chainNames } from '@airswap/constants'
import { LightOrder } from '@airswap/types'
import * as ValidatorContract from '@airswap/validator/build/contracts/Validator.sol/Validator.json'
import * as ValidatorDeploys from '@airswap/validator/deploys.js'

const ValidatorInterface = new ethers.utils.Interface(
  JSON.stringify(ValidatorContract.abi)
)

export class Validator {
  public chainId: number
  private contract: ethers.Contract

  public constructor(
    chainId = chainIds.RINKEBY,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = new ethers.Contract(
      ValidatorDeploys[chainId],
      ValidatorInterface,
      signerOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public static getAddress(chainId = chainIds.RINKEBY): string {
    if (chainId in ValidatorDeploys) {
      return Validator[chainId]
    }
    throw new Error(`Light Validator deploy not found or chainId ${chainId}`)
  }

  public async checkSwap(
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
    const [count, errors] = await contract.checkSwap(
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
      senderWallet
    )
    return this.convertToArray(count, errors)
  }

  private convertToArray(count: BigNumber, errors: Array<string>) {
    const res: Array<string> = []
    for (let idx = 0; idx < count.toNumber(); idx++) {
      res.push(ethers.utils.parseBytes32String(errors[idx]))
    }
    return res
  }
}
