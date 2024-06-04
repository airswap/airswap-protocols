const { ChainIds, stakingTokenAddresses } = require('@airswap/utils')
const wrappedTokenAddresses = require('@airswap/wrapper/deploys-weth')

module.exports = {
  [ChainIds.MAINNET]: {
    stakingToken: stakingTokenAddresses[ChainIds.MAINNET],
    stakingCost: '1000000000',
    supportCost: '1000000',
  },
  [ChainIds.SEPOLIA]: {
    stakingToken: stakingTokenAddresses[ChainIds.SEPOLIA],
    stakingCost: '1000000000',
    supportCost: '1000000',
  },
  [ChainIds.HOLESKY]: {
    stakingToken: stakingTokenAddresses[ChainIds.HOLESKY],
    stakingCost: '1000000000',
    supportCost: '1000000',
  },
  [ChainIds.BSC]: {
    stakingToken: wrappedTokenAddresses[ChainIds.BSC],
    stakingCost: '1000000000000000000',
    supportCost: '10000000000000000',
  },
  [ChainIds.BSCTESTNET]: {
    stakingToken: wrappedTokenAddresses[ChainIds.BSCTESTNET],
    stakingCost: '1000000000000000000',
    supportCost: '10000000000000000',
  },
  [ChainIds.POLYGON]: {
    stakingToken: wrappedTokenAddresses[ChainIds.POLYGON],
    stakingCost: '100000000000000000000',
    supportCost: '1000000000000000000',
  },
  [ChainIds.MUMBAI]: {
    stakingToken: wrappedTokenAddresses[ChainIds.MUMBAI],
    stakingCost: '100000000000000000000',
    supportCost: '1000000000000000000',
  },
  [ChainIds.AVALANCHE]: {
    stakingToken: wrappedTokenAddresses[ChainIds.AVALANCHE],
    stakingCost: '1000000000000000000',
    supportCost: '10000000000000000',
  },
  [ChainIds.FUJI]: {
    stakingToken: wrappedTokenAddresses[ChainIds.FUJI],
    stakingCost: '1000000000000000000',
    supportCost: '10000000000000000',
  },
  [ChainIds.LINEA]: {
    stakingToken: wrappedTokenAddresses[ChainIds.LINEA],
    stakingCost: '50000000000000000',
    supportCost: '500000000000000',
  },
  [ChainIds.LINEAGOERLI]: {
    stakingToken: wrappedTokenAddresses[ChainIds.LINEAGOERLI],
    stakingCost: '50000000000000000',
    supportCost: '500000000000000',
  },
  [ChainIds.ARBITRUM]: {
    stakingToken: wrappedTokenAddresses[ChainIds.ARBITRUM],
    stakingCost: '50000000000000000',
    supportCost: '500000000000000',
  },
  [ChainIds.ARBITRUMSEPOLIA]: {
    stakingToken: wrappedTokenAddresses[ChainIds.ARBITRUMSEPOLIA],
    stakingCost: '50000000000000000',
    supportCost: '500000000000000',
  },
  [ChainIds.BASE]: {
    stakingToken: wrappedTokenAddresses[ChainIds.BASE],
    stakingCost: '50000000000000000',
    supportCost: '500000000000000',
  },
  [ChainIds.BASESEPOLIA]: {
    stakingToken: wrappedTokenAddresses[ChainIds.BASESEPOLIA],
    stakingCost: '50000000000000000',
    supportCost: '500000000000000',
  },
  [ChainIds.RSK]: {
    stakingToken: wrappedTokenAddresses[ChainIds.RSK],
    stakingCost: '5000000000000000',
    supportCost: '50000000000000',
  },
  [ChainIds.RSKTESTNET]: {
    stakingToken: wrappedTokenAddresses[ChainIds.RSKTESTNET],
    stakingCost: '5000000000000000',
    supportCost: '50000000000000',
  },
  [ChainIds.TELOS]: {
    stakingToken: wrappedTokenAddresses[ChainIds.TELOS],
    stakingCost: '1000000000000000000000',
    supportCost: '10000000000000000000',
  },
  [ChainIds.TELOSTESTNET]: {
    stakingToken: wrappedTokenAddresses[ChainIds.TELOSTESTNET],
    stakingCost: '1000000000000000000000',
    supportCost: '10000000000000000000',
  },
}
