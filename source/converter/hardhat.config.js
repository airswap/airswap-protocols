require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-truffle5')
require('@nomiclabs/hardhat-waffle')
require('ganache-time-traveler')
require('solidity-coverage')

module.exports = {
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
      timeout: 1000000,
    },
    hardhat: {
      forking: {
        url:
          'https://eth-mainnet.alchemyapi.io/v2/' + process.env.ALCHEMY_API_KEY,
        blockNumber: 13158665,
      },
    },
    coverage: {
      url: 'http://localhost:8555',
    },
    ganache: {
      url: 'http://127.0.0.1:8545',
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
      timeout: 1000000,
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY,
      gasPrice: 72e9,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
      timeout: 1000000,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.4',
      },
      {
        version: '0.7.6',
      },
      {
        version: '0.6.6',
        settings: {
          // See the solidity docs for advice about optimization and evmVersion
          optimizer: {
            enabled: true,
            runs: 999999,
          },
          evmVersion: 'istanbul',
          outputSelection: {
            '*': {
              '': ['ast'],
              '*': [
                'evm.bytecode.object',
                'evm.deployedBytecode.object',
                'abi',
                'evm.bytecode.sourceMap',
                'evm.deployedBytecode.sourceMap',
                'metadata',
              ],
            },
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 1000000,
  },
  paths: {
    artifacts: './build',
  },
}
