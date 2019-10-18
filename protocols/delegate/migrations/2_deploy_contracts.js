const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')
const TransferHandlerRegistry = artifacts.require('@airswap/transfer-handler-registry/contracts/TransferHandlerRegistry.sol')
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)

  deployer.deploy(TransferHandlerRegistry)
    .then(() => TransferHandlerRegistry.deployed())
    .then(() => deployer.deploy(Swap, TransferHandlerRegistry.address))
    .then(() => deployer.deploy(Delegate, Swap.address, EMPTY_ADDRESS, EMPTY_ADDRESS))
}
