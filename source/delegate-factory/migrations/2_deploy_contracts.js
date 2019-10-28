const DelegateFactory = artifacts.require('DelegateFactory')
const Types = artifacts.require('Types')
const Swap = artifacts.require('Swap')
const FungibleToken = artifacts.require('FungibleToken')
const Indexer = artifacts.require('Indexer')

module.exports = async(deployer) => {
  await deployer.deploy(Types)
  await deployer.link(Types, Swap)
  await deployer.deploy(Swap)
  let swap = await Swap.deployed();
  await deployer.deploy(FungibleToken)
  let token = await FungibleToken.deployed();
  await deployer.deploy(Indexer, token.address)
  let indexer = await Indexer.deployed();
  await deployer.deploy(DelegateFactory, swap.address, indexer.address)
}
