require('dotenv').config()
const HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8545,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    rinkeby: {
      network_id: 4,
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        "https://rinkeby.infura.io/v3/" + process.env.INFURA_API_KEY
      ),
      from: process.env.ACCOUNT_0
    }
  },
  compilers: {
    solc: {
      version: '0.5.12',
      optimization: true,
      runs: 200
    },
  },
}
