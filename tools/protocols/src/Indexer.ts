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
import { chainIds, chainNames, protocols, INDEX_HEAD } from '@airswap/constants'
import { LocatorResult } from '@airswap/types'

import * as IndexerContract from '@airswap/indexer/build/contracts/Indexer.json'
import * as indexerDeploys from '@airswap/indexer/deploys.json'
const IndexerInterface = new ethers.utils.Interface(
  JSON.stringify(IndexerContract.abi)
)

export class Indexer {
  public chainId: string
  private contract: ethers.Contract

  public constructor(
    chainId = chainIds.RINKEBY,
    walletOrProvider?: ethers.Wallet | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = new ethers.Contract(
      indexerDeploys[chainId],
      IndexerInterface,
      walletOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  public static getAddress(chainId = chainIds.RINKEBY): string {
    if (chainId in indexerDeploys) {
      return indexerDeploys[chainId]
    }
    throw new Error(`Indexer deploy not found for chainId ${chainId}`)
  }

  public async getLocators(
    signerToken: string,
    senderToken: string,
    protocol = protocols.SERVER,
    limit = 10,
    cursor = INDEX_HEAD
  ): Promise<LocatorResult> {
    const result = await this.contract.getLocators(
      signerToken,
      senderToken,
      protocol,
      cursor,
      limit
    )
    const locators: Array<string> = []
    for (const locator of result.locators) {
      try {
        switch (protocol) {
          case protocols.SERVER:
            locators.push(ethers.utils.parseBytes32String(locator))
            break
          case protocols.DELEGATE:
            locators.push(ethers.utils.getAddress(locator.slice(0, 42)))
            break
          default:
            locators.push(locator)
        }
      } catch (e) {
        continue
      }
    }
    return {
      locators,
      scores: result.scores,
      nextCursor: result.nextCursor,
    }
  }
}
