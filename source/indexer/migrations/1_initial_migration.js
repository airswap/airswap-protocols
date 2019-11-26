const Indexer = artifacts.require('Indexer')

module.exports = (deployer, network) => {
  if (network == 'rinkeby') {
    // fill in the address of this contract
    const STAKING_TOKEN_ADDRESS = '0xCC1CBD4f67cCeb7c001bD4aDF98451237a193Ff8'
    deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  }
}
