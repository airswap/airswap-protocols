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
import { chainIds, chainNames, MIN_CONFIRMATIONS } from '@airswap/constants'

const DelegateContract = require('@airswap/delegate/build/contracts/Delegate.json')

export class Delegate {
  locator: string
  chainId: string
  contract: any

  constructor(
    locator: string,
    chainId = chainIds.RINKEBY,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ) {
    this.locator = locator
    this.chainId = chainId
    this.contract = new ethers.Contract(
      locator,
      DelegateContract.abi,
      signerOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  async getWallet(): Promise<string> {
    return await this.contract.tradeWallet()
  }

  async getMaxQuote(signerToken: string, senderToken: string): Promise<any> {
    const result = await this.contract.getMaxQuote(signerToken, senderToken)
    return {
      signer: {
        token: signerToken,
        amount: result.signerAmount.toString(),
      },
      sender: {
        token: senderToken,
        amount: result.senderAmount.toString(),
      },
    }
  }

  async getSignerSideQuote(
    senderAmount: string,
    senderToken: string,
    signerToken: string
  ): Promise<any> {
    const signerAmount = await this.contract.getSignerSideQuote(
      senderAmount,
      senderToken,
      signerToken
    )
    if (signerAmount.isZero()) {
      throw new Error('Not quoting for the requested pair')
    }
    return {
      signer: {
        token: signerToken,
        amount: signerAmount.toString(),
      },
      sender: {
        token: senderToken,
        amount: senderAmount,
      },
    }
  }

  async provideOrder(order: any, signer?: ethers.Signer): Promise<string> {
    let contract = this.contract
    if (!this.contract.signer) {
      if (signer === undefined) {
        throw new Error('Signer must be provided')
      } else {
        contract = new ethers.Contract(
          this.locator,
          DelegateContract.abi,
          signer
        )
      }
    }
    const tx = await contract.provideOrder(order)
    await tx.wait(MIN_CONFIRMATIONS)
    return tx.hash
  }
}
