const Light = artifacts.require('Light')

module.exports = async (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    await deployer.deploy(Light)
  }
}
