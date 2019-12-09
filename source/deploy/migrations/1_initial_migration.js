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

  if (network == 'rinkeby') {
    STAKING_TOKEN_ADDRESS = process.env.RINKEBY_AST
    WETH_ADDRESS = process.env.RINKEBY_WETH
  }

  if (network == 'mainnet') {
    STAKING_TOKEN_ADDRESS = process.env.MAINNET_AST
    WETH_ADDRESS = process.env.MAINNET_WETH
  }

  assert(STAKING_TOKEN_ADDRESS, "Staking token is not set")
  assert(WETH_ADDRESS, "WETH Token is not set")

  await deployer.deploy(Types)
  await Swap.link("Types", Types.address)
  await deployer.deploy(Swap)
  await deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  await deployer.deploy(DelegateFactory, Swap.address, Indexer.address)
  await deployer.deploy(Wrapper, Swap.address, WETH_ADDRESS)
};
