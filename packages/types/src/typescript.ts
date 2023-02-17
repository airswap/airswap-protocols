export type Signature = {
  v: string
  r: string
  s: string
}

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

export type Settlement = {
  chainId: number
  swapContract: string
}

export type FullOrderERC20 = UnsignedOrderERC20 & Signature & Settlement

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

export type OrderParty = {
  wallet: string
  token: string
  kind: string
  id: string
  amount: string
}

export type UnsignedClaim = {
  nonce: string
  expiry: string
  participant: string
  score: string
}

export type Claim = {
  nonce: string
  expiry: string
  participant: string
  score: string
} & Signature

export type Token = {
  address: string
  symbol: string
  decimals: number
}

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

export { TokenInfo } from '@uniswap/token-lists'
