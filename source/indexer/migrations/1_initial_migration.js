const Indexer = artifacts.require('Indexer')

module.exports = (deployer, network) => {
  if (network == 'mainnet') {
    // fill in the address of this contract
    const STAKING_TOKEN_ADDRESS = '0x27054b13b1b798b345b591a4d22e6562d47ea75a'
    deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  }
}
