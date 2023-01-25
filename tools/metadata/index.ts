import axios from 'axios'
import * as ethers from 'ethers'
import { TokenInfo } from '@uniswap/token-lists'
import { defaults, tokenListURLs } from './constants'
import { tokenKinds } from '@airswap/constants'

import { abi as ERC165_ABI } from '@openzeppelin/contracts/build/contracts/ERC165.json'
import { abi as ERC20_ABI } from '@openzeppelin/contracts/build/contracts/ERC20.json'
import { abi as ERC721_ABI } from '@openzeppelin/contracts/build/contracts/ERC721.json'
import { abi as ERC777_ABI } from '@openzeppelin/contracts/build/contracts/ERC777.json'
import { abi as ERC1155_ABI } from '@openzeppelin/contracts/build/contracts/ERC1155.json'

export async function getKnownTokens(
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

export async function getTokenFromContract(
  provider: ethers.providers.BaseProvider,
  address: string,
  id?: string
): Promise<TokenInfo> {
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
      } else if (await contract.supportsInterface(tokenKinds.ERC777)) {
        tokenKind = tokenKinds.ERC777
      }
    }
  }
  switch (tokenKind) {
    case tokenKinds.ERC721:
      return await getERC721FromContract(provider, address, id)
    case tokenKinds.ERC777:
      return await getERC777FromContract(provider, address)
    case tokenKinds.ERC1155:
      return await getERC1155FromContract(provider, address, id)
    default:
      return await getERC20FromContract(provider, address)
  }
}

export async function getERC20FromContract(
  provider: ethers.providers.BaseProvider,
  address: string
): Promise<TokenInfo> {
  const contract = new ethers.Contract(address, ERC20_ABI, provider)
  const [name, symbol] = await Promise.all([contract.name(), contract.symbol()])
  return {
    chainId: (await provider.getNetwork()).chainId,
    address: address.toLowerCase(),
    name,
    symbol,
    extensions: {
      kind: tokenKinds.ERC20,
    },
    decimals: Number(await contract.decimals()),
  }
}

export async function getERC721FromContract(
  provider: ethers.providers.BaseProvider,
  address: string,
  id: string
): Promise<TokenInfo> {
  const contract = new ethers.Contract(address, ERC721_ABI, provider)
  const [name, symbol] = await Promise.all([contract.name(), contract.symbol()])

  let uri = await contract.tokenURI(id)
  if (uri.startsWith('ipfs')) {
    uri = `https://cloudflare-ipfs.com/${uri.replace('://', '/')}`
  }
  const res = await axios.get(uri)

  return {
    chainId: (await provider.getNetwork()).chainId,
    address: address.toLowerCase(),
    name,
    symbol: symbol || name.toUpperCase(),
    extensions: {
      kind: tokenKinds.ERC721,
      ...res.data,
    },
    decimals: Number(0),
  }
}

export async function getERC777FromContract(
  provider: ethers.providers.BaseProvider,
  address: string
): Promise<TokenInfo> {
  const contract = new ethers.Contract(address, ERC777_ABI, provider)
  const [name, symbol] = await Promise.all([contract.name(), contract.symbol()])
  return {
    chainId: (await provider.getNetwork()).chainId,
    address: address.toLowerCase(),
    name,
    symbol,
    extensions: {
      kind: tokenKinds.ERC777,
    },
    decimals: Number(await contract.decimals()),
  }
}

export async function getERC1155FromContract(
  provider: ethers.providers.BaseProvider,
  address: string,
  id: string
): Promise<TokenInfo> {
  const contract = new ethers.Contract(address, ERC1155_ABI, provider)
  let uri = await contract.uri(id)
  if (uri.startsWith('ipfs')) {
    uri = `https://cloudflare-ipfs.com/${uri.replace('://', '/')}`
  }
  const res = await axios.get(uri)
  return {
    chainId: (await provider.getNetwork()).chainId,
    address: address.toLowerCase(),
    name: '',
    symbol: '',
    extensions: {
      kind: tokenKinds.ERC1155,
      ...res.data,
    },
    decimals: Number(0),
  }
}
