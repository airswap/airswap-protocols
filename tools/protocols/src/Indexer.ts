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

const IndexerContract = require('@airswap/indexer/build/contracts/Indexer.json')
const indexerDeploys = require('@airswap/indexer/deploys.json')

export class Indexer {
  chainId: string
  contract: any

  constructor(
    chainId = chainIds.RINKEBY,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ) {
    this.chainId = chainId
    this.contract = new ethers.Contract(
      indexerDeploys[chainId],
      IndexerContract.abi,
      signerOrProvider ||
        ethers.getDefaultProvider(chainNames[chainId].toLowerCase())
    )
  }

  async getLocators(
    signerToken: string,
    senderToken: string,
    protocol = '0x0000',
    limit = 10,
    cursor = INDEX_HEAD
  ) {
    const result = await this.contract.getLocators(
      signerToken,
      senderToken,
      protocol,
      cursor,
      limit
    )
    let locator
    const locators = []
    for (let i = 0; i < result.locators.length; i++) {
      try {
        switch (protocol) {
          case protocols.SERVER:
            locator = ethers.utils.parseBytes32String(result.locators[i])
            break
          case protocols.DELEGATE:
            locator = ethers.utils.getAddress(result.locators[i].slice(0, 42))
            break
          default:
            locator = result.locators[i]
        }
        locators.push(locator)
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
