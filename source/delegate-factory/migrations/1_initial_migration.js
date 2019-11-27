const DelegateFactory = artifacts.require('DelegateFactory');

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    // fill in the addresses of these contracts
    const SWAP_ADDRESS = ''
    const INDEXER_ADDRESS = ''
    deployer.deploy(DelegateFactory, SWAP_ADDRESS, INDEXER_ADDRESS)
  }
};
