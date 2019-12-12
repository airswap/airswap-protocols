const Wrapper = artifacts.require('Wrapper')

module.exports = (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    // fill in the addresses of these contracts
    const WETH_ADDRESS = ''
    const SWAP_ADDRESS = ''
    deployer.deploy(Wrapper, SWAP_ADDRESS, WETH_ADDRESS)
  }
}
