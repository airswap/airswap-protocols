const { ChainIds } = require('@airswap/constants')

module.exports = {
  [ChainIds.MAINNET]: {
    protocolFee: 7,
    protocolFeeLight: 7,
    bonusScale: 10,
    bonusMax: 100,
  },
}
