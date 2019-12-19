const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')

module.exports = async (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    // fill in the address of this contract
    await deployer.deploy(TransferHandlerRegistry)
  }
}
