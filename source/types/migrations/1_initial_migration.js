const Types = artifacts.require('Types')

module.exports = (deployer, network) => {
  if (network == 'mainnet') {
    deployer.deploy(Types)
  }
}
