import axios from 'axios'
import * as ethers from 'ethers'
import { TokenInfo } from '@uniswap/token-lists'
import { defaults, known } from './src/constants'
import { getTokenName, getTokenSymbol, getTokenDecimals } from './src/helpers'

export async function fetchTokens(chainId: number): Promise<Array<TokenInfo>> {
  const tokens = await Promise.all(
    known.map(async url => {
      const { data } = await axios.get(url)
      return data.tokens
    })
  )
  tokens.push(defaults)
  return [].concat(...tokens).filter(token => {
    return token.chainId === chainId
  })
}

export async function scrapeToken(
  address: string,
  provider: ethers.providers.BaseProvider
): Promise<TokenInfo> {
  const [tokenSymbol, tokenName, tokenDecimals] = await Promise.all([
    getTokenSymbol(address, provider),
    getTokenName(address, provider),
    getTokenDecimals(address, provider),
  ])

  return {
    chainId: provider.network.chainId,
    address,
    name: tokenName,
    symbol: tokenSymbol,
    decimals: tokenDecimals,
  }
}

export function findTokenByAddress(
  address: string,
  tokens: TokenInfo[]
): TokenInfo {
  return tokens.find(token => {
    return token.address === address
  })
}

export function findTokensBySymbol(
  symbol: string,
  tokens: TokenInfo[]
): TokenInfo[] {
  return tokens.filter(token => {
    return token.symbol === symbol
  })
}
