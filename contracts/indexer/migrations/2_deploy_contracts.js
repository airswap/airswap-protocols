const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('@airswap/tokens/contracts/FungibleToken.sol')

module.exports = deployer => {
  deployer
    .deploy(FungibleToken)
    .then(() => FungibleToken.deployed())
    .then(() => deployer.deploy(Indexer, FungibleToken.address, 250))
}
