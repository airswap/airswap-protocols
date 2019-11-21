require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')

module.exports = {
  // contracts_directory: './flatten',
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
      gas: 0x9851a9,
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
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC,
          'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY
        ),
      network_id: 4,
    },
  },
  mocha: {
    timeout: 1000000,
  },
  compilers: {
    solc: {
      version: '0.5.12',
      settings: {
        optimizer: {
          enabled: true,
          runs: 20000,
        },
      },
    },
  },
  plugins: ['truffle-verify', 'truffle-flatten'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
  },
}
