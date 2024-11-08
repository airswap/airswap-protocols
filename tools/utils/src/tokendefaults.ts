import { ChainIds } from './constants'
import type { TokenInfo } from './types'
const TEST_TOKEN_DECIMALS = 6

export default [
  {
    address: '0x20aaebad8c7c6ffb6fdaa5a622c399561562beea',
    chainId: ChainIds.SEPOLIA,
    decimals: TEST_TOKEN_DECIMALS,
    name: 'USDT',
    symbol: 'USDT',
  },
  {
    address: '0xf450ef4f268eaf2d3d8f9ed0354852e255a5eaef',
    chainId: ChainIds.SEPOLIA,
    decimals: TEST_TOKEN_DECIMALS,
    name: 'USDC',
    symbol: 'USDC',
  },
  {
    address: '0xdeca72bda0cdf62d79b46b1585b380c9c6d57d9e',
    chainId: ChainIds.BSCTESTNET,
    decimals: TEST_TOKEN_DECIMALS,
    name: 'USDT',
    symbol: 'USDT',
  },
  {
    address: '0x517d482f686f11b922eed764692f2b42663ce2fa',
    chainId: ChainIds.BSCTESTNET,
    decimals: TEST_TOKEN_DECIMALS,
    name: 'USDC',
    symbol: 'USDC',
  },
  {
    address: '0x517d482f686f11b922eed764692f2b42663ce2fa',
    chainId: ChainIds.MUMBAI,
    decimals: TEST_TOKEN_DECIMALS,
    name: 'USDT',
    symbol: 'USDT',
  },
  {
    address: '0xdeca72bda0cdf62d79b46b1585b380c9c6d57d9e',
    chainId: ChainIds.MUMBAI,
    decimals: TEST_TOKEN_DECIMALS,
    name: 'USDC',
    symbol: 'USDC',
  },
] as TokenInfo[]
