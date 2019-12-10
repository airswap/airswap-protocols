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
    // FILL WITH DEVELOPMENT VALUES
    STAKING_TOKEN_ADDRESS = "0xCC1CBD4f67cCeb7c001bD4aDF98451237a193Ff8"
    WETH_ADDRESS = "0xc778417E063141139Fce010982780140Aa0cD5Ab"
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
