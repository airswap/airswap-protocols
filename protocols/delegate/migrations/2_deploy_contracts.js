const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')
const TokenRegistry = artifacts.require('@airswap/token-registry/contracts/TokenRegistry.sol')
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)

  deployer.deploy(TokenRegistry)
    .then(() => TokenRegistry.deployed())
    .then(() => deployer.deploy(Swap, TokenRegistry.address))
    .then(() => deployer.deploy(Delegate, Swap.address, EMPTY_ADDRESS, EMPTY_ADDRESS))
}
