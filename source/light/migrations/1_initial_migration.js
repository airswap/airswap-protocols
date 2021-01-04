const Swap = artifacts.require('Swap')

module.exports = async (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    await deployer.deploy(Swap)
  }
}
