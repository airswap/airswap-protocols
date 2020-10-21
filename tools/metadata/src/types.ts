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
  assetDecimals: number
  contractAddress: string
  symbol: string
}

export interface IdexResponse {
  [data: string]: Array<IdexToken>
}
