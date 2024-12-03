import { ethers } from 'ethers'
import validUrl from 'valid-url'
import {
  TokenKinds,
  chainCurrencies,
  chainNames,
  stakingTokenAddresses,
  wrappedNativeTokenAddresses,
} from './constants'
import TOKEN_DEFAULTS from './tokendefaults'
import TOKEN_LISTS from './tokenlists'
import type {
  CollectionTokenAttribute,
  CollectionTokenInfo,
  CollectionTokenMetadata,
  TokenInfo,
} from './types'

const AIRSWAP_LOGO_URI =
  'https://storage.googleapis.com/subgraph-images/158680119781426823563.png'
const AIRSWAP_SYMBOL = 'AST'
const DEFAULT_NAME = 'Unknown NFT'
const DEFAULT_IPFS_URI = 'https://ipfs.io/ipfs/'

import { abi as ERC20_ABI } from './abis/ERC20.json'
import { abi as ERC165_ABI } from './abis/ERC165.json'
import { abi as ERC721_ABI } from './abis/ERC721.json'
import { abi as ERC1155_ABI } from './abis/ERC1155.json'

export async function getKnownTokens(
  chainId: number
): Promise<{ tokens: TokenInfo[]; errors: string[] }> {
  const errors: Array<string> = []
  let tokens = []
  tokens.push(
    ...TOKEN_DEFAULTS.map((token) => ({
      ...token,
      address: token.address.toLowerCase(),
    }))
  )
  if (TOKEN_LISTS[chainId]) {
    const promises = await Promise.allSettled(
      TOKEN_LISTS[chainId].map(async (url) => {
        try {
          const data = await (await fetch(url)).json()
          if (data.tokens) {
            return data.tokens
          }
          return { url, message: 'Invalid token list' }
        } catch (e: any) {
          return { url, message: e.message }
        }
      })
    )
    for (const promise of promises) {
      if (promise.status === 'fulfilled') {
        if (promise.value.message) {
          errors.push(promise.value)
        } else {
          tokens.push(...promise.value)
        }
      } else {
        errors.push(promise.reason.message)
      }
    }
  }
  tokens = tokens.filter((token) => {
    return (
      token.address &&
      token.chainId === chainId &&
      token.symbol !== AIRSWAP_SYMBOL
    )
  })
  if (stakingTokenAddresses[chainId]) {
    const stakingTokens = getStakingTokens()
    for (let i = 0; i < stakingTokens.length; i++) {
      if (stakingTokens[i].chainId === chainId) {
        tokens.push(stakingTokens[i])
      }
    }
  }
  if (wrappedNativeTokenAddresses[chainId]) {
    const wrappedTokens = getWrappedTokens()
    for (let i = 0; i < wrappedTokens.length; i++) {
      if (wrappedTokens[i].chainId === chainId) {
        tokens.push(wrappedTokens[i])
      }
    }
  }
  const hasToken: any = {}
  let length = tokens.length
  while (length--) {
    if (hasToken[tokens[length].address.toLowerCase()]) {
      tokens.splice(length, 1)
    } else {
      hasToken[tokens[length].address.toLowerCase()] = 1
    }
  }
  return { tokens, errors }
}

export function findTokenByAddress(
  address: string,
  tokens: TokenInfo[]
): TokenInfo | null {
  return (
    tokens.find((token) => {
      return token.address.toLowerCase() === address.toLowerCase()
    }) || null
  )
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
): TokenInfo | null {
  return (
    tokens.find((token) => {
      return token.symbol === symbol
    }) || null
  )
}

export function getWrappedTokens(): TokenInfo[] {
  const _wrappedTokens: TokenInfo[] = []
  for (const chainId in wrappedNativeTokenAddresses) {
    const _chainId = Number(chainId)
    _wrappedTokens.push({
      name: `Wrapped ${chainCurrencies[_chainId]}`,
      symbol: `W${chainCurrencies[_chainId]}`,
      address: wrappedNativeTokenAddresses[_chainId],
      decimals: 18,
      chainId: Number(_chainId),
    })
  }
  return _wrappedTokens
}

export function getStakingTokens(): TokenInfo[] {
  const _stakingTokens: TokenInfo[] = []
  for (const chainId in stakingTokenAddresses) {
    const _chainId = Number(chainId)
    _stakingTokens.push({
      name: `AirSwap Token${
        _chainId !== 1 ? ` (${chainNames[_chainId]} Placeholder)` : ''
      }`,
      symbol: `AST${
        _chainId !== 1 ? ` (${chainNames[_chainId]} Placeholder)` : ''
      }`,
      address: stakingTokenAddresses[_chainId],
      decimals: 4,
      logoURI: AIRSWAP_LOGO_URI,
      chainId: Number(_chainId),
    })
  }
  return _stakingTokens
}

export async function getTokenKind(
  provider: ethers.providers.Provider,
  address: string
): Promise<string> {
  const contract = new ethers.Contract(address, ERC165_ABI, provider)
  let supportsERC165 = true
  let tokenKind = TokenKinds.ERC20
  try {
    if (await contract.supportsInterface(TokenKinds.ERC721)) {
      tokenKind = TokenKinds.ERC721
    }
  } catch (e) {
    supportsERC165 = false
  }
  if (supportsERC165) {
    if (tokenKind === TokenKinds.ERC20) {
      if (await contract.supportsInterface(TokenKinds.ERC1155)) {
        tokenKind = TokenKinds.ERC1155
      }
    }
  }
  return tokenKind
}

export async function getTokenInfo(
  provider: ethers.providers.Provider,
  address: string
): Promise<TokenInfo> {
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`Invalid address: ${address}`)
  }
  const contract = new ethers.Contract(address, ERC20_ABI, provider)
  let name: string
  let symbol: string
  let decimals: number
  try {
    ;[name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ])
  } catch (e) {
    throw new Error(`Unable to get ERC20 from contract at ${address}`)
  }
  return {
    chainId: (await provider.getNetwork()).chainId,
    address: address.toLowerCase(),
    name,
    symbol,
    decimals,
  }
}

export async function getCollectionTokenInfo(
  provider: ethers.providers.Provider,
  address: string,
  id: string
): Promise<CollectionTokenInfo> {
  const kind = await getTokenKind(provider, address)

  let uri = null
  let metadata = null

  if (!ethers.utils.isAddress(address)) {
    throw new Error(`Invalid address: ${address}`)
  }
  try {
    switch (kind) {
      case TokenKinds.ERC721:
        uri = await new ethers.Contract(address, ERC721_ABI, provider).tokenURI(
          id
        )
        metadata = transformERC721ToCollectionToken(await fetchMetaData(uri))
        break
      case TokenKinds.ERC1155:
        uri = await new ethers.Contract(address, ERC1155_ABI, provider).uri(id)
        metadata = transformERC1155ToCollectionToken(
          await fetchMetaData(uri.replace(/{id}/g, id))
        )
        break
    }
  } catch (e: any) {
    throw `Unable to fetch token metadata: ${e.message}`
  }
  return {
    chainId: (await provider.getNetwork()).chainId,
    address: address.toLowerCase(),
    kind,
    id,
    uri,
    ...metadata,
  }
}

async function fetchMetaData(url: string, ipfsUri = DEFAULT_IPFS_URI) {
  if (validUrl.isUri(url)) {
    let data: any
    if (url.startsWith('ipfs')) {
      data = await (await fetch(url.replace('ipfs://', ipfsUri))).json()
    } else {
      data = await (await fetch(url)).json()
    }
    if (typeof data === 'string')
      try {
        return JSON.parse(data)
      } catch (e) {
        return {}
      }
    return data
  }
  return {}
}

const transformErc721TokenAttributeToCollectionTokenAttribute = (
  attribute: any
): CollectionTokenAttribute => ({
  label: attribute.item || attribute.trait_type || '',
  value: `${attribute.value}`,
})

const transformERC721ToCollectionToken = (
  metadata: any,
  ipfsUri = DEFAULT_IPFS_URI
): CollectionTokenMetadata => ({
  name: metadata.name || DEFAULT_NAME,
  description: metadata.description,
  image: metadata.image?.replace('ipfs://', ipfsUri),
  animation_url: metadata.animation_url?.replace('ipfs://', ipfsUri),
  attributes: (metadata.attributes || []).map(
    transformErc721TokenAttributeToCollectionTokenAttribute
  ),
})

const transformErc1155TokenAttributeToCollectionTokenAttribute = (
  attribute: any
): CollectionTokenAttribute => ({
  label: attribute.trait_type,
  value: `${attribute.value}`,
})

const transformERC1155ToCollectionToken = (
  metadata: any,
  ipfsUri = DEFAULT_IPFS_URI
): CollectionTokenMetadata => ({
  name: metadata.name || DEFAULT_NAME,
  description: metadata.description,
  image:
    (metadata.image_url || metadata.image || '').replace('ipfs://', ipfsUri) ||
    undefined,
  animation_url: metadata.animation_url?.replace('ipfs://', ipfsUri),
  createdBy: metadata.created_by,
  attributes: (metadata.attributes || []).map(
    transformErc1155TokenAttributeToCollectionTokenAttribute
  ),
})
