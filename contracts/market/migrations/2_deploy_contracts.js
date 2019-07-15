const Market = artifacts.require('Market')
const FungibleToken = artifacts.require(
  '@airswap/tokens/contracts/FungibleToken.sol'
)

module.exports = deployer => {
  deployer
    .deploy(FungibleToken)
    .then(() => FungibleToken.deployed())
    .then(() =>
      deployer.deploy(Market, FungibleToken.address, FungibleToken.address)
    )
}
