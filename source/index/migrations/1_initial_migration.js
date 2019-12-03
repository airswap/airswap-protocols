const Index = artifacts.require('Index')

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    deployer.deploy(Index)
  }
};
