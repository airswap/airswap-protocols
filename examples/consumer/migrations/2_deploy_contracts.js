const Consumer = artifacts.require('Consumer')
const Indexer = artifacts.require('@airswap/indexer/contracts/Indexer.sol')
const FungibleToken = artifacts.require(
  '@airswap/tokens/contracts/FungibleToken.sol'
)
const Swap = artifacts.require('@airswap/indexer/contracts/Swap.sol')
const Transfers = artifacts.require(
  '@airswap/libraries/contracts/Transfers.sol'
)
const Types = artifacts.require('@airswap/libraries/contracts/Types.sol')

module.exports = deployer => {
  deployer.deploy(Transfers)
  deployer.deploy(Types)
  deployer.link(Transfers, Swap)
  deployer.link(Types, Swap)
  deployer.deploy(Swap)
  deployer
    .deploy(FungibleToken)
    .then(() => FungibleToken.deployed())
    .then(() => deployer.deploy(Indexer, FungibleToken.address, 250))
    .then(() => deployer.deploy(Consumer, Swap.address, Indexer.address))
}
