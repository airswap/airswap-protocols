import { expect } from 'chai'
import { WETH } from '../index'
import { ChainIds } from '@airswap/constants'

describe('Contract', () => {
  it('getAddress (WETH)', () => {
    expect(WETH.getAddress(ChainIds.MAINNET)).to.equal(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
  })
  it('getBlockNumber(WETH)', () => {
    expect(WETH.getBlockNumber(ChainIds.MAINNET)).to.equal(4719568)
  })
})
