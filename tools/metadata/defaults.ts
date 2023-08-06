import { TokenInfo } from '@airswap/types'

export default [
  /*
   * Goerli Defaults
   */
  {
    name: 'Tether USD',
    address: '0x79c950c7446b234a6ad53b908fbf342b01c4d446',
    decimals: 6,
    symbol: 'USDT',
    chainId: 5,
  },
  {
    name: 'USD//C',
    address: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    decimals: 6,
    symbol: 'USDC',
    chainId: 5,
  },
  {
    name: 'Dai',
    address: '0x2899a03ffdab5c90badc5920b4f53b0884eb13cc',
    decimals: 18,
    symbol: 'DAI',
    chainId: 5,
  },
] as TokenInfo[]
