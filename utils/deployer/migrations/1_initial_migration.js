require('dotenv').config();
var assert = require('assert');
const Types = artifacts.require('Types');
const Swap = artifacts.require('Swap');
const Wrapper = artifacts.require('Wrapper');
const Indexer = artifacts.require('Indexer');
const DelegateFactory = artifacts.require('DelegateFactory');

module.exports = async(deployer, network) => {

  let STAKING_TOKEN_ADDRESS
  let WETH_ADDRESS 

  if (network == 'development') {
    STAKING_TOKEN_ADDRESS = "FILL_WITH_ERC20"
    WETH_ADDRESS = "FILL_WITH_ERC20"
  }
  else {
    network = network.toUpperCase()
    STAKING_TOKEN_ADDRESS = process.env[network + "_AST"]
    WETH_ADDRESS = process.env[network + "_WETH"]
  }

  await deployer.deploy(Types)
  await Swap.link("Types", Types.address)
  await deployer.deploy(Swap)
  await deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  await deployer.deploy(DelegateFactory, Swap.address, Indexer.address)
  await deployer.deploy(Wrapper, Swap.address, WETH_ADDRESS)
};
