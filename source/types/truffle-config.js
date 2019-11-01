require('dotenv').config()
const HDWalletProvider = require('truffle-hdwallet-provider')

module.exports = {
  contracts_directory: './flat',
  networks: {
    contracts_directory: './flat',
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
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC,
          'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY
        ),
      network_id: 4,
    },
  },
  compilers: {
    solc: {
      version: '0.5.12',
      optimization: false,
    },
  },
  plugins: ['truffle-verify'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
  },
}
