require('dotenv').config();
var assert = require('assert');
const Types = artifacts.require('Types');
const Swap = artifacts.require('Swap');
const Wrapper = artifacts.require('Wrapper');
const Indexer = artifacts.require('Indexer');
const DelegateFactory = artifacts.require('DelegateFactory');

module.exports = async(deployer, network) => {

  assert.notEqual(network, 'development', "Please choose a network besides 'development'")

  network = network.toUpperCase()

  let STAKING_TOKEN_ADDRESS = process.env[network + "_AST"]
  let WETH_ADDRESS = process.env[network + "_WETH"]

  await deployer.deploy(Types)
  await Swap.link("Types", Types.address)
  await deployer.deploy(Swap)
  await deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  await deployer.deploy(DelegateFactory, Swap.address, Indexer.address)
  await deployer.deploy(Wrapper, Swap.address, WETH_ADDRESS)
};
