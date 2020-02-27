export interface NormalizedToken {
  name: string
  address: string
  symbol: string
  decimals: number
  image?: string
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
