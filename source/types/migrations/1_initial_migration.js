const Types = artifacts.require('Types')

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    deployer.deploy(Types)
  }
}
