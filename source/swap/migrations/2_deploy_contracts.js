const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')

module.exports = deployer => {
  deployer.deploy(Types)
  deployer.link(Types, Swap)
  deployer.deploy(Swap)
}
