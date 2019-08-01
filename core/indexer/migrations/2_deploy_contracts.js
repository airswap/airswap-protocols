const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require(
  '@airswap/common/tokens/FungibleToken.sol'
)

module.exports = deployer => {
  deployer
    .deploy(FungibleToken)
    .then(() => FungibleToken.deployed())
    .then(() => deployer.deploy(Indexer, FungibleToken.address, 250))
}
