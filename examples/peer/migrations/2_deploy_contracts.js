const Peer = artifacts.require('Peer')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer
    .deploy(Swap)
    .then(() => Swap.deployed())
    .then(() => deployer.deploy(Peer, Swap.address))
}
