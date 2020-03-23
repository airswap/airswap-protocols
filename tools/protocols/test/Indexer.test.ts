import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Indexer } from '..'

class MockContract {
  public getLocators(signerToken, senderToken, protocol, limit, cursor) {
    return {
      locators: ['locator1', 'locator2'],
      scores: [100, 10],
      nextCursor: ADDRESS_ZERO,
    }
  }
}

describe('Indexer', () => {
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Indexer getAddress()', async () => {
      const address = await Indexer.getAddress()
      expect(address).to.equal('0x10F6702447414cE1250Af5f7000D7c9A0f04E824')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Indexer getLocators()', async () => {
      const result = await new Indexer().getLocators('', '', '', 0, '')
      expect(result.locators[0]).to.equal('locator1')
      expect(result.locators[1]).to.equal('locator2')
      expect(result.scores[0]).to.equal(100)
      expect(result.scores[1]).to.equal(10)
      expect(result.nextCursor).to.equal(ADDRESS_ZERO)
    })
})
