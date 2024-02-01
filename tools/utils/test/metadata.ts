import { expect } from 'chai'
import {
  ADDRESS_ZERO,
  ChainIds,
  getKnownTokens,
  findTokenByAddress,
} from '../index'

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

describe('Metadata: Sepolia', async () => {
  let result: any

  it('fetches all known tokens', async () => {
    result = await getKnownTokens(ChainIds.SEPOLIA)
    expect(result.tokens.length).to.not.equal(0)
  })
  it('checks that ETH does not exist', async () => {
    expect(findTokenByAddress(ADDRESS_ZERO, result.tokens)).to.be.equal(null)
  })
})
