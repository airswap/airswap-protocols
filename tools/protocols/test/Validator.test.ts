import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Validator } from '..'

class MockContract {
  public getLocators(signerToken, senderToken, protocol, limit, cursor) {
    return {
      locators: ['locator1', 'locator2'],
      scores: [100, 10],
      nextCursor: ADDRESS_ZERO,
    }
  }
}

describe('Validator', () => {
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Validator getAddress()', async () => {
      const address = await Validator.getAddress()
      expect(address).to.equal('0x2D8849EAaB159d20Abf10D4a80c97281A12448CC')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Validator getReason()', async () => {
      const reason = await Validator.getReason('test reason')
      expect(reason).to.equal('test reason')
    })
})
