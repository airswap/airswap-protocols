module.exports = {
  typechain: {
    outDir: 'typechain',
  },
  ...require('../../hardhat.config.js'),
}

module.exports.networks.hardhat = {
  forking: {
    url: 'https://eth-mainnet.alchemyapi.io/v2/' + process.env.ALCHEMY_API_KEY,
    blockNumber: 13158665,
  },
}

module.exports.solidity.compilers = [
  {
    version: '0.8.7',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  {
    version: '0.6.6',
    settings: {
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
]
