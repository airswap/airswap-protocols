const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require(
  '@airswap/tokens/contracts/FungibleToken.sol'
)
const ONE_DAY = 60 * 60 * 24

module.exports = deployer => {
  deployer
    .deploy(FungibleToken)
    .then(() => FungibleToken.deployed())
    .then(() => deployer.deploy(Indexer, FungibleToken.address, 250, ONE_DAY))
}
