const DelegateFrontend = artifacts.require('DelegateFrontend')
const Indexer = artifacts.require('@airswap/indexer/contracts/Indexer.sol')
const FungibleToken = artifacts.require(
  '@airswap/tokens/contracts/FungibleToken.sol'
)
const TokenRegistry = artifacts.require(
  '@airswap/token-registry/contracts/TokenRegistry.sol'
)
const Swap = artifacts.require('@airswap/indexer/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer.deploy(TokenRegistry)
    .then(() => TokenRegistry.deployed())
    .then(() => deployer.deploy(Swap, TokenRegistry.address))
    .then(() => deployer.deploy(FungibleToken))
    .then(() => FungibleToken.deployed())
    .then(() => deployer.deploy(Indexer, FungibleToken.address, EMPTY_ADDRESS))
    .then(() => deployer.deploy(DelegateFrontend, Swap.address, Indexer.address))
}
