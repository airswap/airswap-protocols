require('dotenv').config();
var assert = require('assert');
const Types = artifacts.require('Types');
const Swap = artifacts.require('Swap');
const Wrapper = artifacts.require('Wrapper');
const Indexer = artifacts.require('Indexer');
const Index = artifacts.require('Index');
const DelegateFactory = artifacts.require('DelegateFactory');

module.exports = async(deployer, network) => {

  network = network.toUpperCase()
  let STAKING_TOKEN_ADDRESS = process.env[network + "_STAKE"]
  let WETH_ADDRESS = process.env[network + "_WETH"]

  //Deploy Base Contracts 
  await deployer.deploy(Types)
  await Swap.link("Types", Types.address)
  await deployer.deploy(Swap)
  await deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  await deployer.deploy(DelegateFactory, Swap.address, Indexer.address, '0x0001')
  await deployer.deploy(Wrapper, Swap.address, WETH_ADDRESS)

  //Deploy Contract-Created Contracts that also need to be verified
  await deployer.deploy(Index)
};
