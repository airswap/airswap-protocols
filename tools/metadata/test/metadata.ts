import { expect } from 'chai'

import {
  fetchTokens,
  findTokenByAddress,
  findTokensBySymbol,
  firstTokenBySymbol,
} from '../index'
import {
  chainIds,
  wrappedTokenAddresses,
  ADDRESS_ZERO,
} from '@airswap/constants'

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

describe('Metadata: Goerli', async () => {
  let result

  it('fetches all known tokens', async () => {
    result = await fetchTokens(chainIds.GOERLI)
    expect(result.tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    expect(findTokenByAddress(ADDRESS_ZERO, result.tokens)).to.be.undefined
  })
  it('checks that WETH exists', async () => {
    expect(
      findTokenByAddress(wrappedTokenAddresses[chainIds.GOERLI], result.tokens)
    ).to.not.be.undefined
    expect(findTokensBySymbol('WETH', result.tokens)[0].address).to.equal(
      wrappedTokenAddresses[chainIds.GOERLI]
    )
    expect(firstTokenBySymbol('WETH', result.tokens).address).to.equal(
      wrappedTokenAddresses[chainIds.GOERLI]
    )
  })
})
