const ethers = require('ethers')
module.exports = {
  assert: require('./src/assert'),
  balances: require('./src/balances'),
  time: require('./src/time'),
  padding: require('./src/padding'),
  getTestWallet: function() {
    const signerPrivateKey =
      '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
    const provider = ethers.getDefaultProvider('rinkeby')
    return new ethers.Wallet(signerPrivateKey, provider)
  },
}
