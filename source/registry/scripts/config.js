const {
  ChainIds,
  stakingTokenAddresses,
  ADDRESS_ZERO,
} = require('@airswap/constants')
const wrappedTokenAddresses = require('@airswap/wrapper/deploys-weth')

module.exports = {
  [ChainIds.MAINNET]: {
    stakingToken: stakingTokenAddresses[ChainIds.MAINNET],
    stakingCost: '1000000000',
    supportCost: '1000000',
  },
  [ChainIds.BSC]: {
    stakingToken: wrappedTokenAddresses[ChainIds.BSC],
    stakingCost: '100000000000000000',
    supportCost: '1000000000000000',
  },
  [ChainIds.POLYGON]: {
    stakingToken: wrappedTokenAddresses[ChainIds.POLYGON],
    stakingCost: '100000000000000000000',
    supportCost: '1000000000000000000',
  },
  [ChainIds.AVALANCHE]: {
    stakingToken: wrappedTokenAddresses[ChainIds.AVALANCHE],
    stakingCost: '1000000000000000000',
    supportCost: '10000000000000000',
  },
  [ChainIds.LINEA]: {
    stakingToken: wrappedTokenAddresses[ChainIds.LINEA],
    stakingCost: '50000000000000000',
    supportCost: '500000000000000',
  },
  [ChainIds.MUMBAI]: {
    stakingToken: ADDRESS_ZERO,
    stakingCost: '0',
    supportCost: '0',
  },
}
