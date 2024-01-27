const { ChainIds } = require('@airswap/constants')

module.exports = {
  [ChainIds.MAINNET]: {
    protocolFee: 5,
    protocolFeeLight: 5,
    bonusScale: 10,
    bonusMax: 100,
  },
}
