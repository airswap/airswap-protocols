const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')

module.exports = deployer => {

  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer
    .deploy(TransferHandlerRegistry)
    .then(() => TransferHandlerRegistry.deployed())
    .then(() => deployer.deploy(Swap, TransferHandlerRegistry.address))
}



