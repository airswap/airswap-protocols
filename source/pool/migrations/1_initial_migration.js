const Pool = artifacts.require('Pool')

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    // Fill in these values prior to deploying
    const POOL_SCALE = 0
    const POOL_MAX = 0
    deployer.deploy(Pool, POOL_SCALE, POOL_MAX)
  }
}
