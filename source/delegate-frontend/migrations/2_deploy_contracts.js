const DelegateFrontend = artifacts.require('DelegateFrontend')
const Indexer = artifacts.require('@airswap/indexer/contracts/Indexer.sol')
const FungibleToken = artifacts.require(
  '@airswap/tokens/contracts/FungibleToken.sol'
)
const Swap = artifacts.require('@airswap/indexer/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer.deploy(Swap)
  deployer
    .deploy(FungibleToken)
    .then(() => FungibleToken.deployed())
    .then(() => deployer.deploy(Indexer, FungibleToken.address))
    .then(() => deployer.deploy(DelegateFrontend, Swap.address, Indexer.address))
}
