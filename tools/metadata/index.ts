import axios from 'axios'
import * as ethers from 'ethers'
import { TokenInfo } from '@uniswap/token-lists'
import { defaults, known } from './src/constants'
import { getTokenName, getTokenSymbol, getTokenDecimals } from './src/helpers'

import allSettled from 'promise.allsettled'
allSettled.shim()

export async function fetchTokens(
  chainId: number
): Promise<{ tokens: TokenInfo[]; errors: string[] }> {
  const errors = []
  let tokens = []
  const promises = await Promise.allSettled(
    known.map(async url => {
      try {
        const res = await axios.get(url)
        return res.data.tokens
      } catch (e) {
        return { url, message: e.message }
      }
    })
  )
  tokens.push(...defaults)
  promises.forEach(promise => {
    if (promise.status === 'fulfilled') {
      if (promise.value.message) {
        errors.push(promise.value)
      } else {
        tokens.push(...promise.value)
      }
    } else {
      errors.push(promise.reason.message)
    }
  })
  tokens = tokens.filter(token => {
    token.address = token.address.toLowerCase()
    return token.chainId === chainId
  })
  return { tokens, errors }
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
    address: address.toLowerCase(),
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

export function firstTokenBySymbol(
  symbol: string,
  tokens: TokenInfo[]
): TokenInfo {
  return tokens.find(token => {
    return token.symbol === symbol
  })
}
