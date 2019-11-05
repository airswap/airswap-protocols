const Index = artifacts.require('Index')

module.exports = (deployer, network) => {
  if (network == 'rinkeby') {
    deployer.deploy(Index)
  }
};
