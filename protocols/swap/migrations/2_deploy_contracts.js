const Swap = artifacts.require('Swap')
const Transfers = artifacts.require('Transfers')
const Types = artifacts.require('Types')

module.exports = deployer => {
  deployer.deploy(Transfers)
  deployer.deploy(Types)
  deployer.link(Transfers, Swap)
  deployer.link(Types, Swap)
  deployer.deploy(Swap)
}
