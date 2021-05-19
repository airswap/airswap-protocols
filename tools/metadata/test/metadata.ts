import { expect } from 'chai'

import {
  fetchTokens,
  findTokenByAddress,
  findTokensBySymbol,
  firstTokenBySymbol,
} from '../index'
import {
  chainIds,
  wethAddresses,
  stakingTokenAddresses,
  ADDRESS_ZERO,
} from '@airswap/constants'

describe('Metadata: Mainnet', async () => {
  let tokens

  it('fetches all known tokens', async () => {
    tokens = await fetchTokens(chainIds.MAINNET)
    expect(tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    expect(findTokenByAddress(ADDRESS_ZERO, tokens)).to.be.undefined
  })
  it('checks that WETH exists', async () => {
    expect(findTokenByAddress(wethAddresses[chainIds.MAINNET], tokens)).to.not
      .be.undefined
  })
  it('finds the AirSwap token', async () => {
    expect(findTokensBySymbol('AST', tokens)[0].address).to.equal(
      stakingTokenAddresses[chainIds.MAINNET]
    )
    expect(firstTokenBySymbol('AST', tokens).address).to.equal(
      stakingTokenAddresses[chainIds.MAINNET]
    )
  })
})

describe('Metadata: Rinkeby', async () => {
  let tokens

  it('fetches all known tokens', async () => {
    tokens = await fetchTokens(chainIds.RINKEBY)
    expect(tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    expect(findTokenByAddress(ADDRESS_ZERO, tokens)).to.be.undefined
  })
  it('checks that WETH exists', async () => {
    expect(findTokenByAddress(wethAddresses[chainIds.RINKEBY], tokens)).to.not
      .be.undefined
  })
  it('finds the AirSwap token', async () => {
    expect(findTokensBySymbol('AST', tokens)[0].address).to.equal(
      stakingTokenAddresses[chainIds.RINKEBY]
    )
    expect(firstTokenBySymbol('AST', tokens).address).to.equal(
      stakingTokenAddresses[chainIds.RINKEBY]
    )
  })
})
