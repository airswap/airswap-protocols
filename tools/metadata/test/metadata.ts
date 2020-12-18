import { expect } from 'chai'
import * as ethers from 'ethers'

import TokenMetadata from '..'
import {
  chainIds,
  wethAddresses,
  stakingTokenAddresses,
  ADDRESS_ZERO,
} from '@airswap/constants'

describe('Metadata: Mainnet', async () => {
  const provider = ethers.getDefaultProvider('mainnet')
  const metadata = new TokenMetadata(provider)

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
  it('finds the airswap token', async () => {
    const tokens = metadata.findTokensBySymbol('AST')
    expect(tokens[0].address).to.equal(stakingTokenAddresses[chainIds.MAINNET])
  })
})

describe('Metadata: Rinkeby', async () => {
  const provider = ethers.getDefaultProvider('rinkeby')
  const metadata = new TokenMetadata(provider)

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
  it('finds the airswap token', async () => {
    const tokens = metadata.findTokensBySymbol('AST')
    expect(tokens[0].address).to.equal(stakingTokenAddresses[chainIds.RINKEBY])
  })
})

describe('Metadata: Goerli', async () => {
  const provider = ethers.getDefaultProvider('goerli')
  const metadata = new TokenMetadata(provider)

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
  it('finds the airswap token', async () => {
    const tokens = metadata.findTokensBySymbol('AST')
    expect(tokens[0].address).to.equal(stakingTokenAddresses[chainIds.GOERLI])
  })
})

describe('Metadata: Kovan', async () => {
  const provider = ethers.getDefaultProvider('kovan')
  const metadata = new TokenMetadata(provider)

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
  it('finds the airswap token', async () => {
    const tokens = metadata.findTokensBySymbol('AST')
    expect(tokens[0].address).to.equal(stakingTokenAddresses[chainIds.KOVAN])
  })
})
