const Wrapper = artifacts.require('Wrapper')
const TransferHandlerRegistry = artifacts.require('@airswap/transfer-handler-registry/contracts/TransferHandlerRegistry.sol')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')
const WETH9 = artifacts.require('@airswap/tokens/contracts/WETH9.sol')

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer.deploy(WETH9)
  deployer.deploy(TransferHandlerRegistry)
    .then(() => TransferHandlerRegistry.deployed())
    .then(() => deployer.deploy(Swap, TransferHandlerRegistry.address))
    .then(() => deployer.deploy(Wrapper, Swap.address, WETH9.address))
}
