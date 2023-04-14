import axios from 'axios'
import * as ethers from 'ethers'
import {
  TokenInfo,
  CollectionTokenInfo,
  CollectionTokenMetadata,
  CollectionTokenAttribute,
} from '@airswap/types'
import { defaults, tokenListURLs } from './constants'
import {
  tokenKinds,
  chainNames,
  stakingTokenAddresses,
} from '@airswap/constants'
// @ts-ignore
import validUrl from 'valid-url'

const AIRSWAP_LOGO_URI =
  'https://storage.googleapis.com/subgraph-images/158680119781426823563.png'
const AIRSWAP_SYMBOL = 'AST'
const DEFAULT_NAME = 'Unknown NFT'

import { abi as ERC165_ABI } from '@openzeppelin/contracts/build/contracts/ERC165.json'
import { abi as ERC20_ABI } from '@openzeppelin/contracts/build/contracts/ERC20.json'
import { abi as ERC721_ABI } from '@openzeppelin/contracts/build/contracts/ERC721.json'
import { abi as ERC1155_ABI } from '@openzeppelin/contracts/build/contracts/ERC1155.json'

export async function getKnownTokens(
  chainId: number
): Promise<{ tokens: TokenInfo[]; errors: string[] }> {
  const errors: Array<string> = []
  let tokens = []
  tokens.push(...defaults)
  if (tokenListURLs[chainId]) {
    const promises = await Promise.allSettled(
      tokenListURLs[chainId].map(async (url) => {
        try {
          const { data } = await axios.get(url)
          if (data.tokens) {
            return data.tokens
          }
          return { url, message: 'Invalid token list' }
        } catch (e: any) {
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
    return (
      token.address &&
      token.chainId === chainId &&
      token.symbol !== AIRSWAP_SYMBOL
    )
  })
  if (stakingTokenAddresses[chainId]) {
    const stakingTokens = getStakingTokens()
    for (let i = 0; i < stakingTokens.length; i++) {
      if (stakingTokens[i].chainId == chainId) {
        tokens.push(stakingTokens[i])
      }
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

export function getStakingTokens(): TokenInfo[] {
  const _stakingTokens: TokenInfo[] = []
  for (const chainId in stakingTokenAddresses) {
    const _chainId = Number(chainId)
    _stakingTokens.push({
      name:
        'AirSwap Token' +
        (_chainId !== 1 ? ` (${chainNames[_chainId]} Placeholder)` : ''),
      symbol:
        'AST' +
        (_chainId !== 1 ? ` (${chainNames[_chainId]} Placeholder)` : ''),
      address: stakingTokenAddresses[_chainId],
      decimals: 4,
      logoURI: AIRSWAP_LOGO_URI,
      chainId: Number(_chainId),
    })
  }
  return _stakingTokens
}

export async function getTokenKind(
  provider: ethers.providers.BaseProvider,
  address: string
): Promise<string> {
  const contract = new ethers.Contract(address, ERC165_ABI, provider)
  let supportsERC165 = true
  let tokenKind = tokenKinds.ERC20
  try {
    if (await contract.supportsInterface(tokenKinds.ERC721)) {
      tokenKind = tokenKinds.ERC721
    }
  } catch (e) {
    supportsERC165 = false
  }
  if (supportsERC165) {
    if (tokenKind === tokenKinds.ERC20) {
      if (await contract.supportsInterface(tokenKinds.ERC1155)) {
        tokenKind = tokenKinds.ERC1155
      }
    }
  }
  return tokenKind
}

export async function getTokenInfo(
  provider: ethers.providers.BaseProvider,
  address: string
): Promise<TokenInfo> {
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`Invalid address: ${address}`)
  }
  const contract = new ethers.Contract(address, ERC20_ABI, provider)
  let name
  let symbol
  let decimals
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
  provider: ethers.providers.BaseProvider,
  address: string,
  id: string
): Promise<CollectionTokenInfo> {
  const tokenKind = await getTokenKind(provider, address)

  let uri = null
  let metadata = null

  if (!ethers.utils.isAddress(address)) {
    throw new Error(`Invalid address: ${address}`)
  }
  if (isNaN(Number(id))) {
    throw new Error(`Invalid id: ${id}`)
  }
  try {
    switch (tokenKind) {
      case tokenKinds.ERC721:
        uri = await new ethers.Contract(address, ERC721_ABI, provider).tokenURI(
          id
        )
        metadata = transformERC721ToCollectionToken(await fetchMetaData(uri))
        break
      case tokenKinds.ERC1155:
        uri = await new ethers.Contract(address, ERC1155_ABI, provider).uri(id)
        metadata = transformERC1155ToCollectionToken(await fetchMetaData(uri))
        break
    }
  } catch (e: any) {
    throw `Unable to fetch token metadata: ${e.message}`
  }
  return {
    chainId: (await provider.getNetwork()).chainId,
    kind: tokenKind,
    address: address.toLowerCase(),
    id: Number(id),
    uri,
    ...metadata,
  }
}

async function fetchMetaData(uri: string) {
  if (validUrl.isUri(uri)) {
    if (uri.startsWith('ipfs')) {
      uri = `https://cloudflare-ipfs.com/${uri.replace('://', '/')}`
    }
    const { data } = await axios.get(uri)
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
  metadata: any
): CollectionTokenMetadata => ({
  name: metadata.name || DEFAULT_NAME,
  description: metadata.description,
  image: metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/'),
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
  metadata: any
): CollectionTokenMetadata => ({
  name: metadata.name || DEFAULT_NAME,
  description: metadata.description,
  image:
    (metadata.image_url || metadata.image || '').replace(
      'ipfs://',
      'https://ipfs.io/ipfs/'
    ) || undefined,
  attributes: (metadata.attributes || []).map(
    transformErc1155TokenAttributeToCollectionTokenAttribute
  ),
  createdBy: metadata.created_by,
})
