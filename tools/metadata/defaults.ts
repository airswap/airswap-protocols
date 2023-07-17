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
  /*
   * Linea-Goerli Defaults
   */
  {
    name: 'Dai',
    address: '0x8741ba6225a6bf91f9d73531a98a89807857a2b3',
    decimals: 18,
    symbol: 'DAI',
    chainId: 59140,
  },
  {
    name: 'Tether USD',
    address: '0x1990BC6dfe2ef605Bfc08f5A23564dB75642Ad73',
    decimals: 6,
    symbol: 'USDT',
    chainId: 59140,
  },
  {
    name: 'USDC',
    address: '0xf56dc6695cF1f5c364eDEbC7Dc7077ac9B586068',
    decimals: 6,
    symbol: 'USDC',
    chainId: 59140,
  },
] as TokenInfo[]
