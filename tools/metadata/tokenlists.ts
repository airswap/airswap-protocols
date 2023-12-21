import { ChainIds } from '@airswap/constants'

export default {
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
  [ChainIds.TELOS]: [
    'https://raw.githubusercontent.com/telosnetwork/token-list/main/telosevm.tokenlist.json',
  ],
  [ChainIds.TELOSTESTNET]: [
    'https://raw.githubusercontent.com/telosnetwork/token-list/main/telosevm.tokenlist.json',
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
    'https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json',
  ],
  [ChainIds.LINEAGOERLI]: [
    'https://raw.githubusercontent.com/Consensys/linea-token-list/main/json/linea-goerli-token-shortlist.json',
  ],
  [ChainIds.LINEA]: [
    'https://raw.githubusercontent.com/Consensys/linea-token-list/main/json/linea-mainnet-token-shortlist.json',
  ],
} as Record<number, string[]>
