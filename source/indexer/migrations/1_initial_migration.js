const Indexer = artifacts.require('Indexer')

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    // fill in the address of this contract
    const STAKING_TOKEN_ADDRESS = ''
    deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  }
}
