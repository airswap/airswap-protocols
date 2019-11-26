const Wrapper = artifacts.require('Wrapper')

module.exports = (deployer, network) => {
  if (network == 'mainnet') {
    // fill in the addresses of these contracts
    const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const SWAP_ADDRESS = '0x5fc1d62123558feAbad1B806FDEfeC1dE61162dE'
    deployer.deploy(Wrapper, SWAP_ADDRESS, WETH_ADDRESS)
  }
}
