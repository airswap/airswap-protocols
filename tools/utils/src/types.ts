export type Settlement = {
  chainId: number
  swapContract: string
}

export type Signature = {
  v: string
  r: string
  s: string
}

export type Token = {
  address: string
  symbol: string
  decimals: number
}

export type { TokenInfo } from '@uniswap/token-lists'

export interface CollectionTokenAttribute {
  label: string
  value: string | number
}

export type CollectionTokenMetadata = {
  name?: string
  image?: string
  description?: string
  attributes?: CollectionTokenAttribute[]
  createdBy?: string
}

export type CollectionTokenInfo = {
  chainId: number
  kind: string
  address: string
  id: string
  uri: string
} & CollectionTokenMetadata
