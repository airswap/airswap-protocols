const Locker = artifacts.require('Locker')

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    const SECONDS_IN_DAY = 86400
    // Fill in these values prior to deploying
    const LOCKING_TOKEN_ADDRESS = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
    const LOCKER_NAME = 'Locker'
    const LOCKER_SYMBOL = 'LCK'
    const LOCKER_DECIMALS = 4
    const THROTTLING_PERCENTAGE = 10
    const THROTTLING_DURATION = 7 * SECONDS_IN_DAY
    const THROTTLING_BALANCE = 100
    deployer.deploy(
      Locker,
      LOCKING_TOKEN_ADDRESS,
      LOCKER_NAME,
      LOCKER_SYMBOL,
      LOCKER_DECIMALS,
      THROTTLING_PERCENTAGE,
      THROTTLING_DURATION,
      THROTTLING_BALANCE
    )
  }
}
