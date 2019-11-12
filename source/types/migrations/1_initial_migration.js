const Types = artifacts.require('Types')

module.exports = (deployer, network) => {
  if (network == 'rinkeby') {
    deployer.deploy(Types)
  }
}
