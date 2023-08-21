import { expect } from 'chai'
import { getKnownTokens, findTokenByAddress } from '../index'
import { ChainIds, ADDRESS_ZERO } from '@airswap/constants'

describe('Metadata: Ethereum', async () => {
  let result: any

  it('fetches all known tokens', async () => {
    result = await getKnownTokens(ChainIds.MAINNET)
    expect(result.tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    expect(findTokenByAddress(ADDRESS_ZERO, result.tokens)).to.be.equal(null)
  })
})

describe('Metadata: Goerli', async () => {
  let result: any

  it('fetches all known tokens', async () => {
    result = await getKnownTokens(ChainIds.GOERLI)
    expect(result.tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    expect(findTokenByAddress(ADDRESS_ZERO, result.tokens)).to.be.equal(null)
  })
})
