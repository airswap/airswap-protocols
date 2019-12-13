const PartialKittyCoreTransferHandler = artifacts.require('PartialKittyCoreTransferHandler')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const ERC721TransferHandler = artifacts.require('ERC721TransferHandler')
const USDTTransferHandler = artifacts.require('USDTTransferHandler')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')

module.exports = deployer => {
  deployer.deploy(PartialKittyCoreTransferHandler)
  deployer.deploy(ERC20TransferHandler)
  deployer.deploy(ERC721TransferHandler)
  deployer.deploy(USDTTransferHandler)
}
