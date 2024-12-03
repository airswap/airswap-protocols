import { ChainIds } from '@airswap/utils'
import { expect } from 'chai'
import { WETH } from '../index'

describe('Contract', () => {
  it('get address (WETH)', () => {
    expect(WETH.getAddress(ChainIds.MAINNET)).to.equal(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
  })
  it('get deployed block (WETH)', () => {
    expect(WETH.getBlock(ChainIds.MAINNET)).to.equal(4719568)
  })
})
