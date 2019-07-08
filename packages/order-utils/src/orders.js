const { defaults, NULL_ADDRESS } = require('./constants')

const signatures = require('./signatures')

module.exports = {
  _knownAccounts: [],
  _verifyingContract: NULL_ADDRESS,
  setKnownAccounts(knownAccounts) {
    this._knownAccounts = knownAccounts
  },
  setVerifyingContract(verifyingContract) {
    this._verifyingContract = verifyingContract
  },
  generateNonce() {
    return new Date().getTime()
  },
  generateExpiry() {
    return Math.round((new Date().getTime() + 60000) / 1000)
  },
  async getOrder({
    expiry = this.generateExpiry(),
    nonce = this.generateNonce(),
    signer = NULL_ADDRESS,
    maker = defaults.Party,
    taker = defaults.Party,
    affiliate = defaults.Party,
  }) {
    const order = {
      expiry,
      nonce,
      maker: { ...defaults.Party, ...maker },
      taker: { ...defaults.Party, ...taker },
      affiliate: { ...defaults.Party, ...affiliate },
    }
    const wallet = signer !== NULL_ADDRESS ? signer : order.maker.wallet
    if (this._knownAccounts.indexOf(wallet) !== -1) {
      return {
        order,
        signature: await signatures.getWeb3Signature(
          order,
          wallet,
          this._verifyingContract
        ),
      }
    }
    return { order }
  },
}
