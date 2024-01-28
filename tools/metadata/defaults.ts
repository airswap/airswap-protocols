import { ChainIds, TokenInfo } from '@airswap/utils'

const TEST_TOKEN_DECIMALS = 6

// Test tokens for Sepolia

export default [
  {
    address: '0x20aaebad8c7c6ffb6fdaa5a622c399561562beea',
    chainId: ChainIds.SEPOLIA,
    decimals: TEST_TOKEN_DECIMALS,
    name: 'Mintable USDT',
    symbol: 'USDT',
  },
  {
    address: '0xf450ef4f268eaf2d3d8f9ed0354852e255a5eaef',
    chainId: ChainIds.SEPOLIA,
    decimals: TEST_TOKEN_DECIMALS,
    name: 'Mintable USDC',
    symbol: 'USDC',
  },
] as TokenInfo[]
