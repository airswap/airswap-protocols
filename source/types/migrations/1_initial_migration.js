const Migrations = artifacts.require('Migrations')
const Types = artifacts.require('Types')

module.exports = deployer => {
  deployer.deploy(Types)
}
