declare module 'eth-contract-metadata' {
  interface MetamaskToken {
    name: string
    logo?: string
    erc20?: boolean
    decimals?: number
    symbol: string
  }

  export interface MetamaskTokens {
    [key: string]: MetamaskToken
  }
}
