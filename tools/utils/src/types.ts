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

export type Transfer = {
  from: string
  to: string
  token: string
  amount: string
}

export type { TokenInfo } from '@uniswap/token-lists'

export interface CollectionTokenAttribute {
  label: string
  value: string | number
}

export type CollectionTokenMetadata = {
  name?: string
  description?: string
  image?: string
  animation_url?: string
  createdBy?: string
  attributes?: CollectionTokenAttribute[]
}

export type CollectionTokenInfo = {
  chainId: number
  kind: string
  address: string
  id: string
  uri: string
} & CollectionTokenMetadata
