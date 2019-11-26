const DelegateFactory = artifacts.require('DelegateFactory');

module.exports = (deployer, network) => {
  if (network == 'mainnet') {
    // fill in the addresses of these contracts
    const SWAP_ADDRESS = '0x5fc1d62123558feAbad1B806FDEfeC1dE61162dE'
    const INDEXER_ADDRESS = '0x393C25AB96913a80b17069a2b061Ee74813d3866'
    deployer.deploy(DelegateFactory, SWAP_ADDRESS, INDEXER_ADDRESS)
  }
};
