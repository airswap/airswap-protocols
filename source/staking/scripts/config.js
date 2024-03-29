const { ChainIds, stakingTokenAddresses } = require('@airswap/utils')
module.exports = {
  [ChainIds.MAINNET]: {
    name: 'Staked AST',
    symbol: 'sAST',
    stakingToken: stakingTokenAddresses[ChainIds.MAINNET],
    stakingDuration: 60 * 60 * 24 * 7 * 20, // 20 WEEKS
    minDurationChangeDelay: 60 * 60 * 24 * 7, // 1 WEEK
  },
  [ChainIds.HOLESKY]: {
    name: 'Staked AST (Holesky)',
    symbol: 'sAST (Holesky)',
    stakingToken: stakingTokenAddresses[ChainIds.HOLESKY],
    stakingDuration: 60 * 60, // 1 HOUR
    minDurationChangeDelay: 60, // 1 MINUTE
  },
  [ChainIds.SEPOLIA]: {
    name: 'Staked AST (Sepolia)',
    symbol: 'sAST (Sepolia)',
    stakingToken: stakingTokenAddresses[ChainIds.SEPOLIA],
    stakingDuration: 60 * 60, // 1 HOUR
    minDurationChangeDelay: 60, // 1 MINUTE
  },
}
