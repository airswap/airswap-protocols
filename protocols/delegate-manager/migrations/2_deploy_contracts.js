const MakerDelegate = artifacts.require('MakerDelegate')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer
    .deploy(Swap)
    .then(() => Swap.deployed())
    .then(() => deployer.deploy(MakerDelegate, Swap.address, EMPTY_ADDRESS, EMPTY_ADDRESS))
}
