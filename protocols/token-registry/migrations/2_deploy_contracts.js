const TokenRegistry = artifacts.require('TokenRegistry')

module.exports = deployer => {
  deployer.deploy(TokenRegistry)
}
