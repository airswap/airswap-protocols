const Wrapper = artifacts.require('Wrapper')
const TokenRegistry = artifacts.require('@airswap/token-registry/contracts/TokenRegistry.sol')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')
const WETH9 = artifacts.require('@airswap/tokens/contracts/WETH9.sol')

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer.deploy(WETH9)
  deployer.deploy(TokenRegistry)
    .then(() => TokenRegistry.deployed())
    .then(() => deployer.deploy(Swap, TokenRegistry.address))
    .then(() => deployer.deploy(Wrapper, Swap.address, WETH9.address))
}
