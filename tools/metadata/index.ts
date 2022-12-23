import axios from 'axios'
import * as ethers from 'ethers'
import { TokenInfo } from '@uniswap/token-lists'
import { defaults, tokenListURLs, openSeaUrls } from './src/constants'
import { tokenKinds } from '@airswap/constants'
import { getTokenName, getTokenSymbol, getTokenDecimals } from './src/helpers'

export async function fetchTokens(
  chainId: number
): Promise<{ tokens: TokenInfo[]; errors: string[] }> {
  const errors = []
  let tokens = []
  tokens.push(...defaults)
  if (tokenListURLs[chainId]) {
    const promises = await Promise.allSettled(
      tokenListURLs[chainId].map(async (url) => {
        try {
          const res = await axios.get(url)
          return res.data.tokens
        } catch (e) {
          return { url, message: e.message }
        }
      })
    )
    promises.forEach((promise) => {
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
  }
  tokens = tokens.filter((token) => {
    token.address = token.address.toLowerCase()
    return token.address && token.chainId === chainId
  })
  return { tokens, errors }
}

export async function scrapeToken(
  address: string,
  ethersProvider: ethers.providers.BaseProvider | string | null,
  chainId?: number
): Promise<TokenInfo> {
  if (ethersProvider === undefined && chainId === undefined) {
    throw new Error('Either ethersProvider or chainId required')
  }
  let provider
  if (typeof ethersProvider === 'string') {
    provider = new ethers.providers.JsonRpcProvider(ethersProvider)
  } else if (ethersProvider !== null) {
    provider = ethersProvider
  } else {
    provider = ethers.getDefaultProvider(chainId)
  }
  chainId = (await provider.getNetwork()).chainId

  if (openSeaUrls[chainId]) {
    const {
      data: { name, symbol, image_url, schema_name },
    } = await axios.get(`${openSeaUrls[chainId]}/asset_contract/${address}`)
    if (schema_name === 'ERC721' || schema_name === 'ERC1155') {
      return {
        chainId,
        address: address.toLowerCase(),
        name,
        symbol,
        extensions: {
          kind: tokenKinds[schema_name],
        },
        logoURI: image_url,
        decimals: 0,
      }
    }
  }

  const [tokenSymbol, tokenName, tokenDecimals] = await Promise.all([
    getTokenSymbol(address, provider),
    getTokenName(address, provider),
    getTokenDecimals(address, provider),
  ])

  return {
    chainId,
    address: address.toLowerCase(),
    name: tokenName,
    symbol: tokenSymbol || tokenName.toUpperCase(),
    extensions: {
      kind: tokenKinds.ERC20,
    },
    decimals: Number(tokenDecimals),
  }
}

export function findTokenByAddress(
  address: string,
  tokens: TokenInfo[]
): TokenInfo {
  return tokens.find((token) => {
    return token.address.toLowerCase() === address.toLowerCase()
  })
}

export function findTokensBySymbol(
  symbol: string,
  tokens: TokenInfo[]
): TokenInfo[] {
  return tokens.filter((token) => {
    return token.symbol === symbol
  })
}

export function firstTokenBySymbol(
  symbol: string,
  tokens: TokenInfo[]
): TokenInfo {
  return tokens.find((token) => {
    return token.symbol === symbol
  })
}
