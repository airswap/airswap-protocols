require('dotenv').config({ path: '../../.env' })
require('@typechain/hardhat')
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-etherscan')
require('solidity-coverage')

const { ChainIds, apiUrls, explorerUrls } = require('@airswap/constants')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    goerli: {
      url: apiUrls[ChainIds.GOERLI] + '/' + process.env.INFURA_API_KEY,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    mainnet: {
      url: apiUrls[ChainIds.MAINNET] + '/' + process.env.INFURA_API_KEY,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    bsctestnet: {
      url: apiUrls[ChainIds.BSCTESTNET],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    bsc: {
      url: apiUrls[ChainIds.BSC],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    fuji: {
      url: apiUrls[ChainIds.FUJI],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    avalanche: {
      url: apiUrls[ChainIds.AVALANCHE],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    mumbai: {
      url: apiUrls[ChainIds.MUMBAI],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    polygon: {
      url: apiUrls[ChainIds.POLYGON],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    arbitrum: {
      url: apiUrls[ChainIds.ARBITRUM],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    arbitrumgoerli: {
      url: apiUrls[ChainIds.ARBITRUMGOERLI],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    rsk: {
      url: apiUrls[ChainIds.RSK],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    rsktestnet: {
      url: apiUrls[ChainIds.RSKTESTNET],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    linea: {
      url: apiUrls[ChainIds.LINEA],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      arbitrumGoerli: process.env.ARBISCAN_API_KEY,
      avalanche: process.env.SNOWTRACE_API_KEY,
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      rsk: process.env.BLOCKSCOUT_API_KEY,
      linea: process.env.BLOCKSCOUT_API_KEY,
    },
    customChains: [
      {
        network: 'rsk',
        chainId: 30,
        urls: {
          apiURL: apiUrls[ChainIds.RSK],
          browserURL: explorerUrls[ChainIds.RSK],
        },
      },
      {
        network: 'linea',
        chainId: 59140,
        urls: {
          apiURL: apiUrls[ChainIds.LINEA],
          browserURL: explorerUrls[ChainIds.LINEA],
        },
      },
      {
        network: 'arbitrumGoerli',
        chainId: 421613,
        urls: {
          apiURL: apiUrls[ChainIds.ARBITRUMGOERLI],
          browserURL: explorerUrls[ChainIds.ARBITRUMGOERLI],
        },
      },
    ],
  },
  paths: {
    artifacts: './build',
  },
}
