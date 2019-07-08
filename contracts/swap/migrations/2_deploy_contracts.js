const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Signatures = artifacts.require('Signatures')
const Transfers = artifacts.require('Transfers')

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.deploy(Signatures)
  deployer.deploy(Transfers)
  deployer.link(Types, Swap)
  deployer.link(Signatures, Swap)
  deployer.link(Transfers, Swap)
  deployer.deploy(Swap)
}
