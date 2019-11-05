const Delegate = artifacts.require('Delegate')

module.exports = (deployer, network) => {
  if (network == 'rinkeby') {
    // fill in the addresses below
    const SWAP_ADDRESS = ''
    const INDEXER_ADDRESS = ''
    const OWNER_ADDRESS = ''
    const TRADE_WALLET_ADDRESS = ''
    deployer.deploy(Delegate, SWAP_ADDRESS, INDEXER_ADDRESS, OWNER_ADDRESS, TRADE_WALLET_ADDRESS)
  }
};
