const DelegateFactory = artifacts.require('DelegateFactory')
const Types = artifacts.require('Types')
const Swap = artifacts.require('Swap')
const TokenRegistry = artifacts.require('TokenRegistry')

module.exports = async(deployer) => {
  await deployer.deploy(Types)
  await deployer.link(Types, Swap)
  await deployer.deploy(TokenRegistry)
  let tokenRegistry = await TokenRegistry.deployed();
  await deployer.deploy(Swap, tokenRegistry.address)
  let swap = await Swap.deployed();
  await deployer.deploy(DelegateFactory, swap.address)
}
