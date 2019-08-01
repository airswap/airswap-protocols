const Wrapper = artifacts.require('Wrapper')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Transfers = artifacts.require('@airswap/common/libraries/Transfers.sol')
const Types = artifacts.require('@airswap/common/libraries/Types.sol')
const WETH9 = artifacts.require('@airswap/common/tokens/WETH9.sol')

module.exports = deployer => {
  deployer.deploy(Transfers)
  deployer.deploy(Types)
  deployer.link(Transfers, Swap)
  deployer.link(Types, Swap)
  deployer.deploy(WETH9)
  deployer
    .deploy(Swap)
    .then(() => deployer.deploy(Wrapper, Swap.address, WETH9.address))
}
