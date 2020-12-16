const Locker = artifacts.require('Locker')

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    // Fill in these values prior to deploying
    const LOCKER_NAME = ''
    const LOCKER_SYMBOL = ''
    const LOCKER_DECIMALS = 0
    const LOCKING_TOKEN_ADDRESS = ''
    deployer.deploy(
      Locker,
      LOCKER_NAME,
      LOCKER_SYMBOL,
      LOCKER_DECIMALS,
      LOCKING_TOKEN_ADDRESS
    )
  }
}
