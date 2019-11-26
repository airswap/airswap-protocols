const DelegateFactory = artifacts.require('DelegateFactory');

module.exports = (deployer, network) => {
  if (network == 'rinkeby') {
    // fill in the addresses of these contracts
    const SWAP_ADDRESS = '0xE032C9585fF89FE9e9e99a3E49c9f302Aa636D77'
    const INDEXER_ADDRESS = '0xb7eEC6973876211EB0222290282fb09e9314fcb6'
    deployer.deploy(DelegateFactory, SWAP_ADDRESS, INDEXER_ADDRESS)
  }
};
