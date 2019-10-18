const DelegateFactory = artifacts.require('DelegateFactory')
const Types = artifacts.require('Types')
const Swap = artifacts.require('Swap')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')

module.exports = async(deployer) => {
  await deployer.deploy(Types)
  await deployer.link(Types, Swap)
  await deployer.deploy(TransferHandlerRegistry)
  let transferHandlerRegistry = await TransferHandlerRegistry.deployed();
  await deployer.deploy(Swap, transferHandlerRegistry.address)
  let swap = await Swap.deployed();
  await deployer.deploy(DelegateFactory, swap.address)
}
