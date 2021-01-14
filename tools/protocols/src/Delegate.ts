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
import {
  chainIds,
  chainNames,
  tokenKinds,
  protocols,
  MIN_CONFIRMATIONS,
} from '@airswap/constants'
import { getTimestamp } from '@airswap/utils'
import { Quote, Order } from '@airswap/types'
import { ERC20 } from './ERC20'

import * as DelegateContract from '@airswap/delegate/build/contracts/Delegate.json'
const DelegateInterface = new ethers.utils.Interface(
  JSON.stringify(DelegateContract.abi)
)

export class Delegate {
  public chainId: string
  public address: string
  private tradeWallet: string
  private contract: ethers.Contract

  public constructor(
    address: string,
    chainId = chainIds.RINKEBY,
    walletOrProvider?: ethers.Wallet | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.address = address
    this.tradeWallet = ''
    this.contract = new ethers.Contract(
      address,
      DelegateInterface,
      walletOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public async getWallet(): Promise<string> {
    if (this.tradeWallet === '') {
      this.tradeWallet = await this.contract.tradeWallet()
    }
    return this.tradeWallet
  }

  public async getMaxQuote(
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
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

  public async getSignerSideQuote(
    senderAmount: string,
    senderToken: string,
    signerToken: string
  ): Promise<Quote> {
    const signerAmount = await this.contract.getSignerSideQuote(
      senderAmount,
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

  public async getSenderSideQuote(
    signerAmount: string,
    signerToken: string,
    senderToken: string
  ): Promise<Quote> {
    const senderAmount = await this.contract.getSenderSideQuote(
      signerAmount,
      signerToken,
      senderToken
    )
    return this.getQuotedOrMaxAvailable(
      senderToken,
      senderAmount,
      signerToken,
      signerAmount
    )
  }

  public async provideOrder(
    order: Order,
    wallet?: ethers.Wallet
  ): Promise<string> {
    let contract = this.contract
    if (!this.contract.signer) {
      if (wallet === undefined) {
        throw new Error('Wallet must be provided')
      } else {
        contract = new ethers.Contract(this.address, DelegateInterface, wallet)
      }
    }
    const tx = await contract.provideOrder(order)
    await tx.wait(MIN_CONFIRMATIONS)
    return tx.hash
  }

  private async getQuotedOrMaxAvailable(
    senderToken: string,
    senderAmount: string,
    signerToken: string,
    signerAmount: string
  ): Promise<Quote> {
    const balance = await new ERC20(senderToken, this.chainId).balanceOf(
      this.tradeWallet
    )
    let finalSenderAmount = ethers.BigNumber.from(senderAmount)
    let finalSignerAmount = ethers.BigNumber.from(signerAmount)
    if (balance.lt(senderAmount)) {
      finalSenderAmount = balance
      finalSignerAmount = ethers.BigNumber.from(senderAmount)
        .div(signerAmount)
        .mul(balance)
    }
    if (finalSenderAmount.isZero() || finalSignerAmount.isZero()) {
      throw {
        code: -33601,
        message: 'Not quoting for requested amount or token pair',
      }
    }
    return {
      timestamp: getTimestamp(),
      protocol: protocols.DELEGATE,
      locator: this.address,
      sender: {
        kind: tokenKinds.ERC20,
        token: senderToken,
        amount: finalSenderAmount.toString(),
      },
      signer: {
        kind: tokenKinds.ERC20,
        token: signerToken,
        amount: finalSignerAmount.toString(),
      },
    }
  }
}
