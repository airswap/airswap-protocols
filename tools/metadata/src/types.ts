import { TokenKinds } from '@airswap/constants'

export interface NormalizedToken {
  name: string
  address: string
  symbol: string
  decimals: number
  image?: string
  kind: TokenKinds
}

export interface IdexToken {
  name: string
  decimals: number
  address: string
  slug: string
}

export interface IdexTokens {
  [symbol: string]: IdexToken
}
