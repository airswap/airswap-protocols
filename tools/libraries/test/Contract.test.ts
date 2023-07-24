import { expect } from 'chai'
import { WETH } from '../index'
import { ChainIds } from '@airswap/constants'

describe('Contract', () => {
  it('get address (WETH)', () => {
    expect(WETH.addresses[ChainIds.MAINNET]).to.equal(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
  })
  it('get deployed block (WETH)', () => {
    expect(WETH.deployedBlocks[ChainIds.MAINNET]).to.equal(4719568)
  })
})
