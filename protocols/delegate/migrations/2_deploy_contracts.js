const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Transfers = artifacts.require(
  '@airswap/libraries/contracts/Transfers.sol'
)
const Types = artifacts.require('@airswap/libraries/contracts/Types.sol')

module.exports = deployer => {
  deployer.deploy(Transfers)
  deployer.deploy(Types)
  deployer.link(Transfers, Swap)
  deployer.link(Types, Swap)
  deployer
    .deploy(Swap)
    .then(() => Swap.deployed())
    .then(() => deployer.deploy(Delegate, Swap.address))
}
