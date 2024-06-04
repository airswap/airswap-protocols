const { ChainIds } = require('@airswap/utils')

module.exports = {
  [ChainIds.MAINNET]: {
    protocolFee: 5,
    protocolFeeLight: 5,
    bonusScale: 10,
    bonusMax: 100,
  },
}
