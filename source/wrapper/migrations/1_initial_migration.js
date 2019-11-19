const Wrapper = artifacts.require('Wrapper')

module.exports = (deployer, network) => {
  if (network == 'mainnet') {
    // fill in the addresses of these contracts
    const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const SWAP_ADDRESS = '0x80F7e4F58DC7Ad93609f956AC5065CaB9De78067'
    deployer.deploy(Wrapper, SWAP_ADDRESS, WETH_ADDRESS)
  }
}
