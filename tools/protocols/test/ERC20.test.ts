import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { ADDRESS_ZERO } from '@airswap/constants'

import { ERC20 } from '..'

const BALANCE = 100
class MockContract {
  public balanceOf() {
    return BALANCE
  }
}

describe('ERC20', () => {
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('ERC20 balanceOf()', async () => {
      const bal = await new ERC20(ADDRESS_ZERO).balanceOf(ADDRESS_ZERO)
      expect(bal).to.equal(BALANCE)
    })
})
