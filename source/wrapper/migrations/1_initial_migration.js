const Wrapper = artifacts.require('Wrapper')

module.exports = (deployer, network) => {
  if (network == 'rinkeby') {
    // fill in the addresses of these contracts
    const WETH_ADDRESS = '0xc778417E063141139Fce010982780140Aa0cD5Ab'
    const SWAP_ADDRESS = '0xE032C9585fF89FE9e9e99a3E49c9f302Aa636D77'
    deployer.deploy(Wrapper, SWAP_ADDRESS, WETH_ADDRESS)
  }
}
