const Wrapper = artifacts.require('Wrapper')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')
const WETH9 = artifacts.require('@airswap/tokens/contracts/WETH9.sol')

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer.deploy(WETH9)
  deployer
    .deploy(Swap)
    .then(() => deployer.deploy(Wrapper, Swap.address, WETH9.address))
}
