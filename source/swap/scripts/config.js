const { ChainIds, TokenKinds } = require('@airswap/utils')

module.exports = {
  [ChainIds.MAINNET]: {
    requiredSenderKind: TokenKinds.ERC20,
    protocolFee: 5,
  },
}
