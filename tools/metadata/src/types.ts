export interface NormalizedToken {
  name: string
  address: string
  symbol: string
  decimals: number
  image?: string
  kind: 'ERC20' | 'ERC721'
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
