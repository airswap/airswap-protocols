/*
  Copyright 2020 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import { ethers } from 'ethers'
import { chainIds, chainNames } from '@airswap/constants'
import { Order } from '@airswap/types'

import * as ValidatorContract from '@airswap/validator/build/contracts/Validator.json'
import * as validatorDeploys from '@airswap/validator/deploys.json'
import * as reasons from '@airswap/validator/reasons/en_us.json'
const ValidatorInterface = new ethers.utils.Interface(
  JSON.stringify(ValidatorContract.abi)
)

export class Validator {
  public chainId: string
  private contract: ethers.Contract

  public constructor(
    chainId = chainIds.RINKEBY,
    walletOrProvider?: ethers.Wallet | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = new ethers.Contract(
      Validator.getAddress(chainId),
      ValidatorInterface,
      walletOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public static getReason(reason: string): string {
    return reasons[reason] || reason
  }

  public static getAddress(chainId = chainIds.RINKEBY): string {
    if (chainId in validatorDeploys) {
      return validatorDeploys[chainId]
    }
    throw new Error(`Validator deploy not found for chainId ${chainId}`)
  }

  public async checkSwap(order: Order): Promise<Array<string>> {
    const [count, errors] = await this.contract.checkSwap(order)
    return this.convertToArray(count, errors)
  }

  public async checkWrappedSwap(
    order: Order,
    fromAddress: string,
    wrapperAddress: string
  ): Promise<Array<string>> {
    const [count, errors] = await this.contract.checkWrappedSwap(
      order,
      fromAddress,
      wrapperAddress
    )
    return this.convertToArray(count, errors)
  }

  public async checkDelegate(
    order: Order,
    delegateAddress: string
  ): Promise<Array<string>> {
    const [count, errors] = await this.contract.checkDelegate(
      order,
      delegateAddress
    )
    return this.convertToArray(count, errors)
  }

  public async checkWrappedDelegate(
    order: Order,
    delegateAddress: string,
    wrapperAddress: string
  ): Promise<Array<string>> {
    const [count, errors] = await this.contract.checkWrappedDelegate(
      order,
      delegateAddress,
      wrapperAddress
    )
    return this.convertToArray(count, errors)
  }

  private convertToArray(count: ethers.BigNumber, errors: Array<string>) {
    const res: Array<string> = []
    for (let idx = 0; idx < count.toNumber(); idx++) {
      res.push(ethers.utils.parseBytes32String(errors[idx]))
    }
    return res
  }
}
