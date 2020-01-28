require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const HDWalletProviderPriv = require('truffle-hdwallet-provider-privkey')

module.exports = {
  contracts_directory: './flatten',
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
    mainnet: {
      provider: () =>
        new HDWalletProviderPriv(
          [process.env.PRIVATE_KEY],
          process.env.MAINNET_NODE
        ),
      gas: 5898551,
      gasPrice: 5000000000, // CHECK THE CURRENT GASPRICE
      network_id: 1,
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC,
          'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY
        ),
      network_id: 4,
      gas: 5898551,
      gasPrice: 1400000000, // CHECK THE CURRENT GASPRICE
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
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
