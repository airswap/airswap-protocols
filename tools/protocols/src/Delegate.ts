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
import { bigNumberify } from 'ethers/utils'
import { chainIds, chainNames, MIN_CONFIRMATIONS } from '@airswap/constants'
import { Quote, SignedOrder } from '@airswap/types'
import { ERC20 } from './ERC20'

import * as DelegateContract from '@airswap/delegate/build/contracts/Delegate.json'
const DelegateInterface = new ethers.utils.Interface(
  JSON.stringify(DelegateContract.abi)
)

export class Delegate {
  chainId: string
  address: string
  tradeWallet: string
  contract: ethers.Contract

  constructor(
    address: string,
    chainId = chainIds.RINKEBY,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.address = address
    this.tradeWallet = ''
    this.contract = new ethers.Contract(
      address,
      DelegateInterface,
      signerOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  async getWallet(): Promise<string> {
    if (this.tradeWallet === undefined) {
      this.tradeWallet = await this.contract.tradeWallet()
    }
    return this.tradeWallet
  }

  async getMaxQuote(signerToken: string, senderToken: string): Promise<Quote> {
    const { senderAmount, signerAmount } = await this.contract.getMaxQuote(
      senderToken,
      signerToken
    )
    return this.getQuotedOrMaxAvailable(
      senderToken,
      senderAmount,
      signerToken,
      signerAmount
    )
  }

  async getSignerSideQuote(
    senderAmount: string,
    senderToken: string,
    signerToken: string
  ): Promise<Quote> {
    const signerAmount = await this.contract.getSignerSideQuote(
      senderAmount,
      senderToken,
      signerToken
    )
    if (signerAmount.isZero()) {
      throw new Error('Not quoting for requested amount or token pair')
    }

    return this.getQuotedOrMaxAvailable(
      senderToken,
      senderAmount,
      signerToken,
      signerAmount
    )
  }

  async getSenderSideQuote(
    signerAmount: string,
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
    const senderAmount = await this.contract.getSenderSideQuote(
      signerAmount,
      signerToken,
      senderToken
    )
    if (senderAmount.isZero()) {
      throw new Error('Not quoting for requested amount or token pair')
    }

    return this.getQuotedOrMaxAvailable(
      senderToken,
      senderAmount,
      signerToken,
      signerAmount
    )
  }

  async provideOrder(
    order: SignedOrder,
    signer?: ethers.Signer
  ): Promise<string> {
    let contract = this.contract
    if (!this.contract.signer) {
      if (signer === undefined) {
        throw new Error('Signer must be provided')
      } else {
        contract = new ethers.Contract(this.address, DelegateInterface, signer)
      }
    }
    const tx = await contract.provideOrder(order)
    await tx.wait(MIN_CONFIRMATIONS)
    return tx.hash
  }

  async getQuotedOrMaxAvailable(
    senderToken: string,
    senderAmount: string,
    signerToken: string,
    signerAmount: string
  ) {
    const balance = await new ERC20(senderToken, this.chainId).balanceOf(
      this.address
    )
    let finalSenderAmount = bigNumberify(senderAmount)
    let finalSignerAmount = bigNumberify(signerAmount)
    if (balance.lt(senderAmount)) {
      finalSenderAmount = balance
      finalSignerAmount = bigNumberify(senderAmount)
        .div(signerAmount)
        .mul(balance)
    }
    return {
      sender: {
        wallet: await this.getWallet(),
        token: senderToken,
        amount: finalSenderAmount.toString(),
      },
      signer: {
        token: signerToken,
        amount: finalSignerAmount.toString(),
      },
    }
  }
}
