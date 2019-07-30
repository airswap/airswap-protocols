module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
      gasPrice: 10000000000,
      gas: 6700000,
    },
  },
  compilers: {
    solc: {
      version: '0.5.10',
      optimization: false,
    },
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions : {
      currency: 'USD',
      gasPrice: 21
    }
  }
}
