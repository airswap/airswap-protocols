import { ChainIds } from '@airswap/constants'

export const tokenListURLs: Record<number, string[]> = {
  [ChainIds.MAINNET]: [
    'https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json',
    'https://raw.githubusercontent.com/SetProtocol/uniswap-tokenlist/main/set.tokenlist.json',
    'https://app.tryroll.com/tokens.json',
    'https://tokens.coingecko.com/uniswap/all.json',
    'https://tokenlist.aave.eth.link',
    'https://tokens.coingecko.com/ethereum/all.json',
  ],
  [ChainIds.RSK]: [
    'https://raw.githubusercontent.com/enkryptcom/dynamic-data/main/tokenlists/rsk.json',
  ],
  [ChainIds.BSC]: [
    'https://raw.githubusercontent.com/ApeSwapFinance/apeswap-token-lists/main/lists/apeswap.json',
    'https://tokens.pancakeswap.finance/pancakeswap-top-100.json',
    'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
  ],
  [ChainIds.POLYGON]: [
    'https://unpkg.com/quickswap-default-token-list@1.2.9/build/quickswap-default.tokenlist.json',
    'https://storageapi.fleek.co/tomafrench-team-bucket/polygon.vetted.tokenlist.json',
  ],
  [ChainIds.ARBITRUM]: [
    'https://bridge.arbitrum.io/token-list-42161.json',
    'https://tracer.finance/tokens',
    'https://storageapi.fleek.co/tomafrench-team-bucket/arbitrum.vetted.tokenlist.json',
  ],
  [ChainIds.AVALANCHE]: [
    'https://matcha.xyz/tokenlists/43114.json',
    'https://raw.githubusercontent.com/pangolindex/tokenlists/main/defi.tokenlist.json',
    'https://raw.githubusercontent.com/pangolindex/tokenlists/main/stablecoin.tokenlist.json',
    'https://raw.githubusercontent.com/pangolindex/tokenlists/main/ab.tokenlist.json',
    'https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/joe.tokenlist.json',
  ],
}

export const defaults = [
  {
    name: 'Wrapped Ether',
    address: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    decimals: 18,
    symbol: 'WETH',
    chainId: 5,
  },
  {
    name: 'Wrapped Ether',
    address: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    decimals: 18,
    symbol: 'WETH',
    chainId: 42,
  },
  {
    name: 'Ether',
    address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    decimals: 18,
    symbol: 'ETH',
    chainId: 56,
  },
  {
    name: 'Wrapped AVAX',
    address: '0xd9d01a9f7c810ec035c0e42cb9e80ef44d7f8692',
    decimals: 18,
    symbol: 'WAVAX',
    chainId: 43113,
  },
  {
    name: 'Wrapped AVAX',
    address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    decimals: 18,
    symbol: 'WAVAX',
    chainId: 43114,
  },
  {
    name: 'AirSwap Token',
    address: '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
    decimals: 4,
    symbol: 'AST',
    chainId: 5,
  },
  {
    name: 'AirSwap Token',
    address: '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
    decimals: 4,
    symbol: 'AST',
    chainId: 42,
  },
  {
    name: 'AirSwap Token',
    address: '0x1ac0d76f11875317f8a7d791db94cdd82bd02bd1',
    decimals: 4,
    symbol: 'AST',
    chainId: 56,
  },
  {
    name: 'AirSwap Token',
    address: '0x48c427e7cEf42399e9e8300fC47875772309e995',
    decimals: 18,
    symbol: 'AST',
    chainId: 43113,
  },
  {
    name: 'AirSwap Token',
    address: '0xc32a3c867abad28d977e1724f92d9684ff3d2976',
    decimals: 18,
    symbol: 'AST',
    chainId: 43114,
  },
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
]
