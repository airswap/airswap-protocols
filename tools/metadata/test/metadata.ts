import { expect } from 'chai'

import {
  fetchTokens,
  findTokenByAddress,
  findTokensBySymbol,
  firstTokenBySymbol,
} from '../index'
import { chainIds, wethAddresses, ADDRESS_ZERO } from '@airswap/constants'

describe('Metadata: Mainnet', async () => {
  let result

  it('fetches all known tokens', async () => {
    result = await fetchTokens(chainIds.MAINNET)
    expect(result.tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    expect(findTokenByAddress(ADDRESS_ZERO, result.tokens)).to.be.undefined
  })
})

describe('Metadata: Rinkeby', async () => {
  let result

  it('fetches all known tokens', async () => {
    result = await fetchTokens(chainIds.RINKEBY)
    expect(result.tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    expect(findTokenByAddress(ADDRESS_ZERO, result.tokens)).to.be.undefined
  })
  it('checks that WETH exists', async () => {
    expect(findTokenByAddress(wethAddresses[chainIds.RINKEBY], result.tokens))
      .to.not.be.undefined
    expect(findTokensBySymbol('WETH', result.tokens)[0].address).to.equal(
      wethAddresses[chainIds.RINKEBY]
    )
    expect(firstTokenBySymbol('WETH', result.tokens).address).to.equal(
      wethAddresses[chainIds.RINKEBY]
    )
  })
})
