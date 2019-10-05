const DelegateFactory = artifacts.require('DelegateFactory')
const Types = artifacts.require('Types')
const Swap = artifacts.require('Swap')

module.exports = async(deployer) => {
  await deployer.deploy(Types)
  await deployer.link(Types, Swap)
  await deployer.deploy(Swap)
  let swap = await Swap.deployed();
  await deployer.deploy(DelegateFactory, swap.address)
}
