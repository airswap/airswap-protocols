export type Settlement = {
  chainId: number
  swapContract: string
}

export type Signature = {
  v: string
  r: string
  s: string
}

export type OrderParty = {
  wallet: string
  token: string
  kind: string
  id: string
  amount: string
}

export type UnsignedOrder = {
  nonce: string
  expiry: string
  protocolFee: string
  signer: OrderParty
  sender: OrderParty
  affiliateWallet: string
  affiliateAmount: string
}

export type Order = UnsignedOrder & Signature

export type FullOrder = UnsignedOrder & Signature & Settlement

export type UnsignedOrderERC20 = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  protocolFee: string
  senderWallet: string
  senderToken: string
  senderAmount: string
}

export type OrderERC20 = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  senderToken: string
  senderAmount: string
} & Signature

export type FullOrderERC20 = UnsignedOrderERC20 & Signature & Settlement

export type Levels = [string, string][]

export type Formula = string

type LevelsOrFomulae =
  | {
      bid: Levels
      ask: Levels
    }
  | {
      bid: Formula
      ask: Formula
    }

export type Pricing = {
  baseToken: string
  quoteToken: string
  minimum?: string
} & LevelsOrFomulae

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
  id: number
  uri: string
} & CollectionTokenMetadata
