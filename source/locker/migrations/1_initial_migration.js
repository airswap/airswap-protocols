const Locker = artifacts.require('Locker')

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    const SECONDS_IN_DAY = 86400
    // Fill in these values prior to deploying
    const LOCKING_TOKEN_ADDRESS = '0x27054b13b1b798b345b591a4d22e6562d47ea75a'
    const LOCKER_NAME = 'Staked AST'
    const LOCKER_SYMBOL = 'sAST'
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
