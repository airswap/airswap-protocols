const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')

module.exports = deployer => {
  deployer.deploy(TransferHandlerRegistry)
}
