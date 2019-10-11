const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const TokenRegistry = artifacts.require('TokenRegistry')

module.exports = deployer => {

  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer
    .deploy(TokenRegistry)
    .then(() => TokenRegistry.deployed())
    .then(() => deployer.deploy(Swap, TokenRegistry.address))
}



