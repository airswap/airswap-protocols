import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Swap } from '..'

class MockContract {
  public getLocators(signerToken, senderToken, protocol, limit, cursor) {
    return {
      locators: ['locator1', 'locator2'],
      scores: [100, 10],
      nextCursor: ADDRESS_ZERO,
    }
  }
}

describe('Swap', () => {
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Swap getAddress()', async () => {
      const address = await Swap.getAddress()
      expect(address).to.equal('0x2e7373D70732E0F37F4166D8FD9dBC89DD5BC476')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Swap swap()', async () => {
      // TODO
    })
})
