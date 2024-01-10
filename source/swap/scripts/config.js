const { TokenKinds } = require('@airswap/constants')

module.exports = {
  [ChainIds.MAINNET]: {
    requiredSenderKind: TokenKinds.ERC20,
    protocolFee: 7,
  },
}
