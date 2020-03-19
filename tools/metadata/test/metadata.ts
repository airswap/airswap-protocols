import { expect } from 'chai'

import TokenMetadata from '..'
import {
  chainIds,
  wethAddresses,
  stakingTokenAddresses,
  ADDRESS_ZERO,
} from '@airswap/constants'

describe('Metadata: Mainnet', async () => {
  const metadata = new TokenMetadata(chainIds.MAINNET)

  it('fetches all known tokens', async () => {
    const tokens = await metadata.fetchKnownTokens()
    expect(tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[ADDRESS_ZERO]).to.be.undefined
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
  it('checks that ETH does not exist', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[ADDRESS_ZERO]).to.be.undefined
  })
  it('checks that WETH exists', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[wethAddresses[chainIds.RINKEBY]]).to.not.be.undefined
  })
  it('fetches the airswap token', async () => {
    const token = await metadata.fetchToken(
      stakingTokenAddresses[chainIds.RINKEBY]
    )
    expect(token.symbol).to.equal('AST')
  })
})

describe('Metadata: Goerli', async () => {
  const metadata = new TokenMetadata(chainIds.GOERLI)

  it('fetches all known tokens', async () => {
    metadata.fetchKnownTokens().then(tokens => {
      expect(tokens.length).to.not.equal(0)
    })
  })
  it('checks that ETH does not exist', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[ADDRESS_ZERO]).to.be.undefined
  })
  it('checks that WETH exists', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[wethAddresses[chainIds.GOERLI]]).to.not.be.undefined
  })
  it('fetches the airswap token', async () => {
    const token = await metadata.fetchToken(
      stakingTokenAddresses[chainIds.GOERLI]
    )
    expect(token.symbol).to.equal('AST')
  })
})

describe('Metadata: Kovan', async () => {
  const metadata = new TokenMetadata(chainIds.KOVAN)

  it('fetches all known tokens', async () => {
    metadata.fetchKnownTokens().then(tokens => {
      expect(tokens.length).to.not.equal(0)
    })
  })
  it('checks that ETH does not exist', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[ADDRESS_ZERO]).to.be.undefined
  })
  it('checks that WETH exists', async () => {
    const byAddress = metadata.getTokensByAddress()
    expect(byAddress[wethAddresses[chainIds.KOVAN]]).to.not.be.undefined
  })
  it('fetches the airswap token', async () => {
    const token = await metadata.fetchToken(
      stakingTokenAddresses[chainIds.KOVAN]
    )
    expect(token.symbol).to.equal('AST')
  })
})
