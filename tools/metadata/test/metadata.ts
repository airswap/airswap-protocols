import { expect } from 'chai'

import TokenMetadata from '..'
import {
  chainIds,
  wethAddresses,
  stakingTokenAddresses,
} from '@airswap/constants'

describe('Metadata: Mainnet', async () => {
  const metadata = new TokenMetadata(chainIds.MAINNET)

  it('fetches all known tokens', async () => {
    const tokens = await metadata.fetchKnownTokens()
    expect(tokens.length).to.not.equal(0)
  })
  it('checks that WETH exists', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[wethAddresses[chainIds.MAINNET]]).to.not.be.undefined
  })
  it('fetches the airswap token', async () => {
    metadata.fetchToken(stakingTokenAddresses[chainIds.MAINNET]).then(token => {
      expect(token.symbol).to.equal('AST')
    })
  })
})

describe('Metadata: Rinkeby', async () => {
  const metadata = new TokenMetadata(chainIds.RINKEBY)

  it('fetches all known tokens', async () => {
    metadata.fetchKnownTokens().then(tokens => {
      expect(tokens.length).to.not.equal(0)
    })
  })
  it('checks that WETH exists', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[wethAddresses[chainIds.RINKEBY]]).to.not.be.undefined
  })
  it('fetches the airswap token', async () => {
    metadata.fetchToken(stakingTokenAddresses[chainIds.RINKEBY]).then(token => {
      expect(token.symbol).to.equal('AST')
    })
  })
})
