import { expect } from 'chai'

import TokenMetadata from '../lib'
import { chainIds, stakingTokenAddresses } from '@airswap/constants'

describe('Metadata: Mainnet', async () => {
  const metadata = new TokenMetadata(chainIds.MAINNET)

  it('fetches all known tokens', async () => {
    metadata.fetchKnownTokens().then(tokens => {
      expect(tokens.length).to.not.equal(0)
    })
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
  it('fetches the airswap token', async () => {
    metadata.fetchToken(stakingTokenAddresses[chainIds.RINKEBY]).then(token => {
      expect(token.symbol).to.equal('AST')
    })
  })
})
