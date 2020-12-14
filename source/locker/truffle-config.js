require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const HDWalletProviderPriv = require('truffle-hdwallet-provider-privkey')

module.exports = {
  // contracts_directory: './flatten',
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
    mainnet: {
      provider: () =>
        new HDWalletProviderPriv(
          [process.env.PRIVATE_KEY],
          'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY
        ),
      gas: 5898551,
      gasPrice: 15900000000, // CHECK THE CURRENT GASPRICE
      network_id: 1,
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
      version: '0.6.12',
      settings: {
        optimizer: {
          enabled: true,
          runs: 20000,
        },
      },
    },
  },
  plugins: ['truffle-verify', 'truffle-flatten', 'solidity-coverage'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
  },
}
